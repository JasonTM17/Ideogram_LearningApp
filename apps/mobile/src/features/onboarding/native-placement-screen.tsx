import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { nativeLayoutTokens } from '@ideogram/design-tokens/native';

import { AppText } from '../../components/app-text';
import { PrimaryAction } from '../../components/primary-action';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { StatusPanel } from '../../components/status-panel';
import { createMobileNativeLearningApiClient } from '../../lib/api/native-learning-api-client';
import { useNativeAuthSession } from '../auth/native-auth-session-provider';
import { useNativeOfflineSync } from '../offline-sync/native-offline-sync-provider';

import type {
  PlacementCatalogResponse,
  PlacementQuestionSet,
  PlacementSessionReceipt,
  PlacementSessionStartReceipt,
} from '@ideogram/contracts';

type ScreenState =
  | { kind: 'loading' }
  | { catalog: PlacementCatalogResponse; kind: 'ready' }
  | {
      catalog: PlacementCatalogResponse;
      index: number;
      kind: 'running';
      session: PlacementSessionStartReceipt;
    }
  | { kind: 'awaiting-sync'; placementSessionId: string }
  | { kind: 'done'; receipt: PlacementSessionReceipt }
  | { kind: 'error'; message: string };

export function NativePlacementScreen() {
  const auth = useNativeAuthSession();
  const offlineSync = useNativeOfflineSync();
  const router = useRouter();
  const [state, setState] = useState<ScreenState>({ kind: 'loading' });
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const selectedSet = useMemo(() => {
    if (state.kind !== 'ready' && state.kind !== 'running') return null;
    return (
      state.catalog.questionSets.find((set) => set.placementQuestionSetId === selectedSetId) ??
      state.catalog.questionSets[0] ??
      null
    );
  }, [selectedSetId, state]);

  const load = async () => {
    if (!auth.hasSession) return;
    setState({ kind: 'loading' });
    try {
      const catalog = await createMobileNativeLearningApiClient(
        auth.sessionProvider,
      ).getPlacementCatalog();
      setSelectedSetId(catalog.questionSets[0]?.placementQuestionSetId ?? null);
      setState({ catalog, kind: 'ready' });
    } catch {
      setState({
        kind: 'error',
        message: 'Chưa thể tải bài placement. Hãy kiểm tra mạng rồi thử lại.',
      });
    }
  };

  useEffect(() => {
    void load();
  }, [auth.hasSession]);

  useEffect(() => {
    if (
      (state.kind !== 'done' || state.receipt.sessionStatus === 'scored') &&
      state.kind !== 'awaiting-sync'
    )
      return;
    let stopped = false;
    const poll = async () => {
      try {
        const receipt = await createMobileNativeLearningApiClient(
          auth.sessionProvider,
        ).getPlacementSession(
          state.kind === 'done' ? state.receipt.placementSessionId : state.placementSessionId,
        );
        if (
          !stopped &&
          (receipt.sessionStatus === 'submitted' || receipt.sessionStatus === 'scored')
        ) {
          setState({ kind: 'done', receipt });
        }
      } catch {
        // Retain the submitted receipt and retry while the screen remains open.
      }
    };
    void poll();
    const interval = setInterval(() => void poll(), 5_000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [auth.sessionProvider, state]);

  const start = async () => {
    if (!selectedSet) return;
    try {
      const session = await createMobileNativeLearningApiClient(
        auth.sessionProvider,
      ).startPlacementSession({
        idempotencyKey: Crypto.randomUUID(),
        placementQuestionSetId: selectedSet.placementQuestionSetId,
      });
      if (state.kind === 'ready')
        setState({ catalog: state.catalog, index: 0, kind: 'running', session });
    } catch {
      setState({
        kind: 'error',
        message: 'Chưa thể bắt đầu bài placement. Bạn có thể thử lại an toàn.',
      });
    }
  };

  const answer = async (selectedChoice: string) => {
    if (state.kind !== 'running' || !selectedSet) return;
    const question = selectedSet.questions[state.index];
    if (!question) return;
    const input = {
      answerPayload: { selectedChoice },
      attemptNumber: 1,
      clientRecordedAt: new Date().toISOString(),
      deviceId: Crypto.randomUUID(),
      deviceSequence: state.index + 1,
      idempotencyKey: Crypto.randomUUID(),
      placementQuestionId: question.placementQuestionId,
      responseTimeMs: 0,
    };
    let answerQueued = false;
    try {
      await createMobileNativeLearningApiClient(auth.sessionProvider).submitPlacementAnswer(
        state.session.placementSessionId,
        input,
      );
    } catch {
      const queued = await offlineSync.enqueue('placement-answer', input.idempotencyKey, {
        input,
        placementSessionId: state.session.placementSessionId,
      });
      if (queued && state.index + 1 < selectedSet.questions.length) {
        setState({ ...state, index: state.index + 1 });
        return;
      }
      if (!queued) {
        setState({
          kind: 'error',
          message: 'Chưa xác nhận được câu trả lời. Hãy thử lại khi mạng ổn định.',
        });
        return;
      }
      answerQueued = true;
    }

    if (state.index + 1 < selectedSet.questions.length) {
      setState({ ...state, index: state.index + 1 });
      return;
    }

    try {
      const receipt = await createMobileNativeLearningApiClient(
        auth.sessionProvider,
      ).submitPlacementSession({ placementSessionId: state.session.placementSessionId });
      setState({ kind: 'done', receipt });
    } catch {
      const queuedSubmit = await offlineSync.enqueue('placement-submit', Crypto.randomUUID(), {
        placementSessionId: state.session.placementSessionId,
      });
      if (queuedSubmit) {
        setState({ kind: 'awaiting-sync', placementSessionId: state.session.placementSessionId });
        return;
      }
      setState({
        kind: 'error',
        message: answerQueued
          ? 'Câu trả lời cuối đã được lưu, nhưng chưa thể lưu thao tác hoàn tất. Hãy thử lại khi có mạng.'
          : 'Máy chủ chưa xác nhận hoàn tất placement. Hãy thử lại khi mạng ổn định.',
      });
    }
  };

  return (
    <ScreenScaffold
      description="Làm vài câu ngắn để ứng dụng đề xuất mức bắt đầu vừa sức."
      eyebrow="Thiết lập lộ trình"
      title="Học đúng từ bước đầu"
    >
      {state.kind === 'loading' ? (
        <StatusPanel
          actionHint="Tải lại bài placement"
          actionLabel="Tải bài placement"
          description="Đang chuẩn bị câu hỏi đã được phát hành."
          onAction={() => void load()}
          title="Đang tải"
          variant="loading"
        />
      ) : null}
      {state.kind === 'error' ? (
        <StatusPanel
          actionHint="Tải lại bài placement"
          actionLabel="Thử lại"
          description={state.message}
          onAction={() => void load()}
          title="Chưa thể tiếp tục"
          variant="error"
        />
      ) : null}
      {state.kind === 'ready' && state.catalog.questionSets.length === 0 ? (
        <StatusPanel
          description="Hiện chưa có bộ câu hỏi placement được phát hành. Bạn vẫn có thể học từ danh mục."
          title="Chưa có bài placement"
          variant="empty"
        />
      ) : null}
      {state.kind === 'ready' && selectedSet ? (
        <PlacementIntro selectedSet={selectedSet} onStart={() => void start()} />
      ) : null}
      {state.kind === 'running' && selectedSet ? (
        <PlacementQuestion index={state.index} onAnswer={answer} questionSet={selectedSet} />
      ) : null}
      {state.kind === 'awaiting-sync' ? (
        <StatusPanel
          actionHint="Gửi phần hoàn tất placement đang chờ trên thiết bị"
          actionLabel="Đồng bộ ngay"
          description="Câu trả lời cuối đã được lưu an toàn. Kết quả chỉ hiện sau khi máy chủ xác nhận thao tác hoàn tất."
          onAction={() => void offlineSync.syncNow()}
          title="Đang chờ đồng bộ"
          variant="loading"
        />
      ) : null}
      {state.kind === 'done' ? (
        <StatusPanel
          actionHint="Quay về hôm nay"
          actionLabel="Về trang hôm nay"
          description={
            state.receipt.recommendedLevelCode
              ? `Mức đề xuất: ${state.receipt.recommendedLevelCode}.`
              : 'Máy chủ đang chấm. Hãy để màn hình mở, kết quả sẽ tự hiện khi sẵn sàng.'
          }
          onAction={() => router.replace('/')}
          title="Bạn đã có điểm xuất phát"
          variant="empty"
        />
      ) : null}
    </ScreenScaffold>
  );
}

function PlacementIntro({
  onStart,
  selectedSet,
}: {
  onStart: () => void;
  selectedSet: PlacementQuestionSet;
}) {
  return (
    <View style={styles.card}>
      <AppText variant="headingMd">{selectedSet.titleVietnamese}</AppText>
      <AppText tone="secondary">
        {selectedSet.questions.length} câu · {selectedSet.languageCode.toUpperCase()} · dữ liệu chấm
        được giữ ở máy chủ.
      </AppText>
      <PrimaryAction
        accessibilityHint="Bắt đầu bài placement"
        label="Bắt đầu placement"
        onPress={onStart}
      />
    </View>
  );
}

function PlacementQuestion({
  index,
  onAnswer,
  questionSet,
}: {
  index: number;
  onAnswer: (choice: string) => void;
  questionSet: PlacementQuestionSet;
}) {
  const question = questionSet.questions[index];
  const choices = Array.isArray(question?.promptPayload.choices)
    ? question.promptPayload.choices
    : [];
  return (
    <View style={styles.card}>
      <AppText tone="secondary">
        Câu {index + 1}/{questionSet.questions.length}
      </AppText>
      <AppText variant="headingMd">
        {String(question?.promptPayload.promptVietnamese ?? 'Chọn câu trả lời phù hợp')}
      </AppText>
      {choices.map((choice) => (
        <Pressable
          key={String(choice)}
          accessibilityRole="button"
          onPress={() => onAnswer(String(choice))}
          style={styles.choice}
        >
          <AppText>{String(choice)}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: nativeLayoutTokens.spacing[4] },
  choice: {
    borderColor: '#cbd5e1',
    borderRadius: nativeLayoutTokens.radius.control,
    borderWidth: 1,
    minHeight: nativeLayoutTokens.touchTarget.android,
    justifyContent: 'center',
    padding: nativeLayoutTokens.spacing[3],
  },
});
