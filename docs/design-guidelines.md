# Ideogram Learning — Hướng dẫn UX/UI

> Bản 0.3 · 2026-07-30 · Nhãn sản phẩm `Ideogram Learning` chỉ là tên làm việc, không phải thương hiệu cuối. Stitch project: `projects/11429302359379765748`; design system: `assets/3415345924425844809` (version 2).

> Ranh giới trạng thái: các mục 2–9 mô tả target UX cho toàn bộ web/mobile.
> Runtime web hiện có landing, invite-only auth, responsive learner shell,
> catalog-backed Today/path/lesson overview, profile/sign-out, bounded
> Vietnamese-first tutor turn, và một vertical slice vocabulary acknowledgement
> trên web + Expo. Onboarding, placement, focused activity/review, sync,
> grounded/SSE AI, progress và native navigation vẫn chưa đạt target này.

## 1. Định hướng sản phẩm

- Người dùng đầu: người lớn Việt Nam học tiếng Nhật; ưu tiên mục tiêu JLPT, đi làm, du học. Mở rộng cùng core sang Trung, rồi Hàn; không thiết kế ba trải nghiệm rời rạc.
- Giá trị cốt lõi: một vòng học ngắn, có truy hồi kiến thức, phản hồi tiếng Việt rõ, và tiến độ đáng tin. AI là coach có căn cứ, không phải chat chung chung hay nguồn chân lý.
- Giọng điệu: điềm tĩnh, cụ thể, tôn trọng thời gian. Dùng “Bạn đang nhầm trợ từ は/が ở đây” thay vì ngôn ngữ phán xét.
- Tránh: streak, huy hiệu, confetti, mascot, màu kẹo, chữ trẻ con, neuomorphism, dashboard nhiều thẻ. Chỉ hiển thị tiến độ khi nó giúp quyết định học tiếp/ôn lại.
- Hướng thị giác: paper-light, editorial và content-first; nền ấm, chữ đậm, một accent có chủ ý. Màu xanh chỉ biểu thị hành động/chọn lựa; cam dùng rất ít cho cảnh báo hoặc CTA học tiếp.

## 2. Kiến trúc thông tin và điều hướng

### Điểm đến cấp một

| Đích | Mục đích | Nội dung chính |
|---|---|---|
| Hôm nay | bắt đầu đúng việc kế tiếp | lesson đề xuất, số thẻ đến hạn, mục tiêu ngày |
| Ôn tập | SRS và hàng đợi có kiểm soát | due now, lọc skill/level, lịch ôn |
| Trợ lý | AI hỗ trợ trong ngữ cảnh học | hỏi đáp, sửa câu, luyện nói/viết, lịch sử theo phiên |
| Tiến độ | phản hồi về quá trình học | mastery, kỹ năng, exam map, lỗi lặp lại |
| Bạn | hồ sơ và kiểm soát | mục tiêu, ngôn ngữ, thông báo, tải offline, quyền riêng tư, trợ giúp |

- **Web ≥1024px:** sidebar trái cố định chứa năm đích trên, logo, chọn language pack; phần Settings/Help/Sign out ở đáy. Header có trạng thái sync, menu tài khoản, breadcrumb khi sâu từ ba cấp. Không dùng bottom tab song song.
- **Web 768–1023px:** sidebar thu gọn thành rail có nhãn tooltip; mở sheet/drawer khi cần mục phụ.
- **Mobile iOS/Android:** bottom tab đúng năm đích trên, mỗi tab có icon vector + nhãn; không thêm tab “More”. Mục phụ ở `Bạn`; back theo back-stack hệ điều hành. Lesson và review là full-screen task flow, không có tab bar để tránh rời bài giữa chừng.
- Chia sẻ giữa web/native: taxonomy, copy, token, trạng thái, deep-link và analytics event. Không chia sẻ page shell, sidebar, tab bar, modal sheet hoặc media controls theo kiểu DOM sang native.

### Cấu trúc nội dung

Gói ngôn ngữ → mục tiêu (JLPT/giao tiếp) → cấp độ → lộ trình → đơn vị học → bài học → hoạt động.

- Một learner chỉ có một pack đang học chính; đổi pack là hành động có xác nhận vì hàng đợi SRS, mục tiêu và tiến độ tách theo pack.
- Bất cứ activity nào cũng hiển thị ngôn ngữ, skill, độ khó, nguồn/rubric nếu AI chấm, và đường quay lại lộ trình.

## 3. Luồng cốt lõi

| Luồng | Happy path | Loading / empty | Error / offline |
|---|---|---|---|
| Onboarding + placement | Chào mừng → chọn mục tiêu sơ bộ → đăng nhập/đăng ký → chọn thời lượng, pack → đặt mức tự đánh giá → placement 5–8 phút → kết quả có độ tin cậy → lộ trình đầu tiên. Có tiến trình, Quay lại, lưu nháp. | Skeleton khi nạp câu; chưa có mục tiêu thì giải thích lợi ích từng lựa chọn. | Lưu cục bộ, banner “Chưa đồng bộ”; retry khi gửi kết quả. Nếu placement lỗi, giữ câu đã trả lời và cho tiếp tục/khởi động lại có xác nhận. |
| Lesson hằng ngày | Hôm nay → một CTA “Bắt đầu bài 8–12 phút” → nghe/đọc → retrieval → feedback tiếng Việt → tóm tắt + “Ôn ngay” hoặc “Xong”. | Skeleton của activity; lesson trống hiển thị lý do và CTA chọn mục tiêu/làm placement. | Activity đã tải vẫn chạy offline; phần cần AI/audio chưa tải bị khóa có lý do, không mất đáp án. Lỗi nộp đáp án: trạng thái chưa đồng bộ + Retry. |
| SRS review | Ôn tập → xem prompt → tự nhớ → lật/nhập đáp án → đánh giá dễ/khó hoặc chấm objective → lịch kế tiếp. Chỉ một quyết định chính mỗi thẻ. | Hiện số thẻ dự kiến; empty = “Hôm nay bạn đã ôn xong” + quay lại Hôm nay. | Cache hàng đợi trước; mỗi review là event có operation ID, device sequence và server receipt sequence. Không dùng thời gian thiết bị để last-write-wins; server merge event xác định, rebuild lịch và thông báo conflict không chặn học. |
| AI tutor | Trợ lý → chọn ngôn ngữ/cấp độ/mục tiêu → gửi câu hỏi tiếng Việt → nhận JSON bounded gồm nhận xét, giải thích, ví dụ, lỗi VN hay gặp, bài tập tiếp và ranh giới nguồn. Streaming, lưu SRS và lịch sử là bước sau. | Bounded form có cấu hình riêng, loading không giả lập nội dung, response card hiển thị đủ sáu phần. | Timeout/503/offline dùng Retry và copy an toàn; nếu AI không đủ căn cứ, nói rõ giới hạn và không bịa nguồn bài học. |
| Tiến độ | Chọn khoảng thời gian → xem mastery theo skill, exam objective, lỗi lặp lại → CTA học/ôn một điểm yếu. | Skeleton theo khối; không đủ dữ liệu nêu cần hoàn thành bao nhiêu activity để có insight. | Dùng snapshot gần nhất kèm thời điểm; retry nền, không hiện biểu đồ trống. |
| Cá nhân hóa AI | Từ `Bạn`/sau activity → giải thích ngắn “Vì sao đề xuất này” → chỉnh mục tiêu, lịch, skill yếu và mức thử thách → xác nhận → Hôm nay cập nhật. | Loading nêu “Đang tạo kế hoạch”; không có lịch sử thì dùng preference do người học chọn. | Không tự đổi mục tiêu khi sync lỗi; giữ cấu hình trước, retry và luôn có “Khôi phục đề xuất mặc định”. |

## 4. Danh mục màn hình

| Nhóm | Màn hình cần có |
|---|---|
| Khởi tạo | splash/session restore, chào mừng, đăng nhập/đăng ký, onboarding mục tiêu, placement, kết quả + lộ trình |
| Học | Hôm nay, lộ trình/unit, lesson intro, activity đọc-nghe-từ vựng-ngữ pháp, lesson completion |
| Ôn | review queue, card/retrieval, typed answer, review summary, lịch ôn |
| AI | tutor home, chat theo ngữ cảnh, speaking recorder/consent, writing feedback, AI limitation/error |
| Tiến độ | overview, skill detail, exam map, lỗi lặp lại, weekly plan |
| Cá nhân | profile, mục tiêu/lịch học, language pack, downloads/offline, notifications, privacy/data, help |
| Hệ thống | loading skeleton, empty, error + retry, offline queue/sync conflict, permission rationale, destructive confirm |

## 5. Responsive và parity

| Kích thước | Bố cục | Nội dung ưu tiên |
|---|---|---|
| 320–767 | một cột, gutter 16–20, fixed bottom tab/safe area | một lesson/review action, copy ngắn, chart tóm tắt |
| 768–1023 | cột đọc chính + panel ngữ cảnh tùy chỗ | transcript, giải thích và controls cùng nhìn thấy |
| ≥1024 | sidebar 248–280, main tối đa 760 cho bài học; tiến độ có panel phụ | lộ trình/queue chi tiết, filter, insight thứ cấp |

- Không đẩy desktop dashboard vào điện thoại. Mobile gộp filter vào sheet, chart thành insight + drill-in, transcript vào disclosure; desktop mở rộng thông tin chứ không thay đổi thứ tự học.
- Đảm bảo 320px, 375px, 768px, 1024px, 1440px; landscape vẫn nhìn thấy CTA và không che nội dung sau safe area. Không khóa zoom hay tạo horizontal scroll.

## 6. Hệ thống trực quan và token

### Token ngữ nghĩa

| Nhóm | Tên | Vai trò |
|---|---|---|
| Surface | `canvas`, `surface`, `surface-raised`, `surface-inverse`, `border-subtle` | nền, vùng đọc, sheet/card, theme tối, phân tách |
| Text | `text-primary`, `text-secondary`, `text-tertiary`, `text-inverse`, `text-link` | phân cấp nội dung; không dùng xám quá nhạt cho body |
| Action | `action-primary`, `on-action-primary`, `action-secondary`, `focus-ring` | bắt đầu/submit, action phụ, keyboard focus |
| Feedback | `success`, `warning`, `danger`, `info`, cùng `on-*` | luôn đi kèm icon/text, không chỉ màu |
| Learning | `mastery-growing`, `mastery-secure`, `review-due`, `ai-context` | trạng thái học; không dùng như thương hiệu hay gamification |

- Web baseline: canvas `#F8FAFC`, surface `#FFFFFF`, text-primary `#0F172A`, action-primary `#1E40AF`, action-secondary `#0F766E`, accent ấm `#C2410C`. Native uses the Stitch-aligned warm editorial variant: light canvas `#FCFAF7`, ink `#211A16`, vermilion action `#B9382E`; dark canvas `#161210`, ink `#FFF8F4`, action `#FF8A72`. Dark là palette riêng, không đảo màu; kiểm tra từng cặp `text/on-*` đạt WCAG AA.
- Spacing 4/8pt; radius nhỏ 8–12 cho control/surface, không “pillow” hay shadow mềm quá mức. Elevation chỉ cho menu, sheet, dialog. Icon vector cùng hệ, 20/24/28 theo token, stroke nhất quán; không emoji cấu trúc.

### Typography CJK + tiếng Việt

- UI Latin/Vietnamese: `Be Vietnam Pro`; fallback `Noto Sans`. Nội dung theo pack dùng `Noto Sans JP`, `Noto Sans SC`, `Noto Sans KR` tương ứng; fallback theo script, không ép một font Latin vẽ CJK.
- Body 16px tối thiểu trên web/mobile, line-height 1.5–1.65; input ≥16px. Heading 20/24/32 theo bậc, weight 600–700; không dùng font display trẻ con.
- Nội dung Nhật hỗ trợ ruby/furigana có toggle; Hán tự hiển thị dạng giản thể/phồn thể đúng pack; Hàn không tách ký tự. Từ/câu mục tiêu có line-height 1.7, không justify; transcript cho wrap tự nhiên.
- Tôn trọng Dynamic Type/Font Scale đến 200%: text được wrap, controls cao lên, không cắt ngữ nghĩa hay chỉ dựa tooltip.

## 7. Component, trạng thái và chuyển động

- Components cơ bản: app bar, side/bottom navigation, primary/secondary/ghost/destructive button, form field, segmented filter, lesson block, review card, audio player + transcript, AI response, progress indicator, metric/insight, sheet/dialog, toast/banner, skeleton.
- Mỗi interactive state có `default`, hover (web), focus-visible, pressed, selected, disabled, loading, error, success. Pressed phản hồi trong 100ms; button async khóa double submit nhưng giữ nhãn/trạng thái rõ.
- Touch target ≥44×44pt iOS, ≥48×48dp Android, khoảng cách ≥8; dùng native picker/share/permission khi phù hợp. Web hỗ trợ Tab, Enter/Space, Escape, skip link và focus sau đổi route/modal.
- Chuyển động 150–300ms, chỉ opacity/transform; forward đi vào, back đi ra theo hướng nhất quán. Loading >300ms dùng skeleton/progress. Không autoplay động tác trang trí, parallax, infinite motion ngoài loader; `prefers-reduced-motion`/Reduce Motion chuyển sang trạng thái tức thời.

## 8. Accessibility, content và trust

- WCAG 2.1 AA tối thiểu: text 4.5:1, text lớn/UI glyph 3:1; trạng thái không chỉ dựa màu; focus 2–4px rõ ở cả light/dark.
- Nhãn rõ cho icon-only control, audio controls, biểu đồ và trạng thái selected/expanded/disabled; dùng semantic heading/landmark trên web, role/label/hint native. Toast/error announce không cướp focus.
- Audio có transcript đồng bộ, tốc độ chậm, replay; speaking yêu cầu consent rõ trước mic, hiển thị đang ghi và có dừng/xóa. Không tự phát âm thanh.
- AI feedback tách fact/rubric khỏi gợi ý; báo độ không chắc, nguồn/giới hạn khi có; không hứa điểm thi. Lịch sử AI, audio và download có entry xem/xóa trong `Bạn`.

## 9. Yêu cầu prompt cho Stitch

- Tạo **cùng IA, không cùng UI runtime**: một bộ web Next.js desktop/tablet và một bộ Expo native iOS/Android; chia sẻ token, typography, content hierarchy, states; không xuất HTML desktop nhét vào app native.
- Prompt phải nêu: Vietnamese-first adult JCK learner, Japanese-first exam-aligned MVP, paper-light editorial/productive aesthetic, no mascot/gamification clutter/neumorphism/emoji icons, vector outline icons, safe areas, dark mode, Dynamic Type, Vietnamese + CJK sample text.
- Mỗi screen prompt phải có: primary task duy nhất, real loading/empty/error/offline variant, keyboard/focus web hoặc accessibility label native, 44/48 touch targets, and reduced-motion behavior.
- Cung cấp tối thiểu các frame: mobile Hôm nay, review card, AI tutor, progress, Bạn; desktop Hôm nay, lesson, review queue, AI tutor, progress. Đính kèm annotation về back behavior, sync state, và platform-native sheet/modal.

## 10. Bàn giao thiết kế

### Native auth handoff

- Stitch screen `999b28cb9c894ea38b83a8780405e1a7` was generated for the
  native sign-in slice. Its HTML is reference-only; Expo rebuilds the hierarchy
  with semantic React Native controls, current tokens, safe areas, dynamic
  text, and explicit disabled/sending/error states.
- [Exported Stitch design](../plans/260729-1500-jck-ai-learning-platform/design/stitch-native-sign-in/design.png)
  and [runtime visual QA](../plans/260729-1500-jck-ai-learning-platform/design/native-sign-in-web-qa.png)
  are checked-in evidence, not a claim of iOS/Android device certification.
- The auth screen has one task: request an invite-only email link. It avoids
  social login, uses 48dp controls, and says neither that an account exists nor
  that a link was definitely delivered.

- Repo đã có mười export Stitch được kiểm chứng tại
  [`assets/designs/stitch/`](../assets/designs/stitch/): năm màn mobile
  (Hôm nay, Ôn tập, Trợ lý, Tiến độ, Bạn) và năm màn desktop (Hôm nay, Bài học,
  Hàng đợi ôn, Trợ lý, Tiến độ). Mỗi export có PNG, HTML và `DESIGN.md`; các ảnh
  `desktop-refined-*` là hướng desktop Việt hóa ưu tiên cho runtime web.
- Vocabulary activity handoff đã được commit riêng cho slice hiện tại:
  - [Desktop Stitch design](../plans/260801-2301-interactive-lesson-activity/design/stitch-desktop-lesson-activity/design.png)
  - [Mobile Stitch design](../plans/260801-2301-interactive-lesson-activity/design/stitch-mobile-lesson-activity/design.png)
  - Đây là design handoff/reference, không phải screenshot runtime và không
    chứng minh parity hay certification.
- Artifact
  [`plans/260729-1500-jck-ai-learning-platform/designs/dashboard-today/`](../plans/260729-1500-jck-ai-learning-platform/designs/dashboard-today/)
  là bản desktop Hôm nay cũ hơn, chỉ dùng để đối chiếu lịch sử hierarchy.
- Các export là visual handoff đã có, không phải bằng chứng rằng đầy đủ state
  loading/empty/error/offline, responsive, dark mode hay accessibility đã được
  phê duyệt. Runtime đã tái dựng public/auth, onboarding/placement, review và
  offline state cốt lõi; real-device native, browser background wake, dark mode
  toàn diện và accessibility certification vẫn cần bằng chứng phát hành.
- HTML từ Stitch chỉ là tài liệu tham chiếu về hierarchy/spacing; không được
  đưa trực tiếp vào Next.js hay Expo. Rebuild theo token, semantic state và
  ranh giới nền tảng ở tài liệu này và
  [`../design-system/ideogram-learning/MASTER.md`](../design-system/ideogram-learning/MASTER.md).

## Unresolved questions

- Cần nghiên cứu mức độ tin cậy tối thiểu để hiển thị score/insight speaking-writing của AI.

Quyết định hiện tại: dùng Lucide outline cho web và mapping cùng tên sang icon native; palette ở trên là token baseline. MVP yêu cầu đăng nhập trước placement để tránh guest-to-account migration và bảo toàn tiến độ đa thiết bị; chỉ phần giới thiệu/mục tiêu sơ bộ được dùng khi chưa đăng nhập.
