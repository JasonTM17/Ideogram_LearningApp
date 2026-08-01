import { ScreenScaffold } from '../../components/screen-scaffold';
import { StatusPanel } from '../../components/status-panel';

import { assistantContent } from './assistant-content';

interface AssistantTutorSessionGateProps {
  hasSession: boolean;
  isHydrating: boolean;
  onSignIn: () => void;
}

export function AssistantTutorSessionGate({
  hasSession,
  isHydrating,
  onSignIn,
}: AssistantTutorSessionGateProps) {
  if (isHydrating) {
    return (
      <ScreenScaffold
        description={assistantContent.description}
        eyebrow={assistantContent.eyebrow}
        title={assistantContent.title}
      >
        <StatusPanel
          description="Đang xác minh phiên học an toàn trước khi mở trợ lý."
          title="Đang chuẩn bị Trợ lý"
          variant="loading"
        />
      </ScreenScaffold>
    );
  }

  if (!hasSession) {
    return (
      <ScreenScaffold
        description={assistantContent.description}
        eyebrow={assistantContent.eyebrow}
        title={assistantContent.title}
      >
        <StatusPanel
          actionHint="Mở màn hình đăng nhập"
          actionLabel="Đăng nhập"
          description="Hãy đăng nhập để gửi câu hỏi và nhận câu trả lời riêng cho tiến độ của bạn."
          onAction={onSignIn}
          title="Cần đăng nhập"
          variant="error"
        />
      </ScreenScaffold>
    );
  }

  return null;
}
