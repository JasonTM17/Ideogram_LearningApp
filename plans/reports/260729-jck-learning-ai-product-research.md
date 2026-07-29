---
title: "Nghiên cứu sản phẩm AI tutor JCK"
date: "2026-07-29"
status: "done"
---

# Nghiên cứu sản phẩm AI tutor JCK

## Tóm tắt
- Khuyến nghị: làm `Japanese-first`, exam-aligned, Vietnamese-first; không launch cả 3 ngôn ngữ cùng lúc.
- Cốt lõi sản phẩm không phải chat chung chung. Phải là hệ luyện tập có `SRS + retrieval practice + listening + speaking + exam mapping`.
- AI nên đóng vai trò `coach + generator + grader có kiểm soát`, không phải nguồn chân lý.
- Lý do: nguồn chính thức của JLPT/HSK/TOPIK đủ để dựng schema thi, nhưng đủ khác nhau để làm all-in-one ngay từ đầu là quá đắt và dễ loạn QA.

## Nguồn chính
- [JLPT official practice workbook](https://www.jlpt.jp/e/samples/sampleindex.html)
- [JLPT section structure](https://www.jlpt.jp/sp/e/guideline/results.html)
- [HSK official syllabus / HSK 3.0](https://www.chinesetest.cn/syllabus)
- [HSK 2026 test calendar](https://admin.chinesetest.cn/gonewcontent.do?id=50278989)
- [TOPIK official site](https://www.topik.go.kr/)
- [Distributed practice meta-analysis](https://pubmed.ncbi.nlm.nih.gov/16719566/)
- [Testing / quizzing meta-analysis](https://pubmed.ncbi.nlm.nih.gov/33683913/)
- [OpenAI privacy policy](https://openai.com/policies/row-privacy-policy/)
- [OpenAI usage policies](https://openai.com/policies/usage-policies/)

## Phân khúc học viên
- `Học để thi`: JLPT/HSK/TOPIK, cần lộ trình rõ, bài tập bám đề, theo dõi tiến bộ.
- `Học để dùng`: giao tiếp, du học, đi làm, cần speaking/listening nhanh, ít lý thuyết.
- `Học mất gốc`: cần giải thích bằng tiếng Việt, so sánh lỗi, bài tập nhỏ, phản hồi tức thì.
- `Học nâng cao`: cần writing, nuance, collocation, honorifics, reading speed, mock test.

## So sánh 3 hướng sản phẩm
| Hướng | Ưu | Nhược | Xếp hạng |
|---|---|---|---|
| 1. `One-core, one-language-first` | Tập trung, QA nhẹ, học nhanh ra kết quả | Chậm phủ thị trường | `#1` |
| 2. `All 3 languages ngay từ đầu` | Trông lớn, marketing dễ kể | QA nổ, content model phức tạp, burn rate cao | `#3` |
| 3. `Conversation-first generic tutor` | Rẻ lúc đầu, demo nhanh | Không đủ “exam/job value”, retention thấp | `#2` |

## Khuyến nghị rollout ngôn ngữ
- Bước 1: `Japanese` trước. JLPT có cấu trúc chính thức rõ, bộ đề mẫu và section mapping ổn định, dễ dựng content engine.
- Bước 2: `Chinese` sau. HSK 3.0 đã có syllabus rõ theo `tasks/topics/vocabulary/grammar/characters`, phù hợp mở rộng khi core đã chín.
- Bước 3: `Korean` cuối. TOPIK tách riêng thành vertical sau khi đã có bộ QA, audio pipeline, và rubric chấm nói/viết.
- Đây là suy luận sản phẩm từ độ trưởng thành của tài liệu chính thức, không phải phán quyết về quy mô thị trường.

## MVP đề xuất
- Placement test 5-8 phút.
- Lesson ngắn theo mục tiêu thi + mục tiêu dùng.
- `SRS` cho từ vựng, kanji/hanja, cấu trúc câu, mẫu phản xạ.
- `Retrieval practice` bắt buộc, không chỉ xem lại.
- Listening drills có transcript, slow mode, shadowing.
- Speaking có chấm sơ bộ bằng rubric, không hứa “chấm chuẩn như giáo viên”.
- Giải thích tiếng Việt theo mẫu cố định: `đúng/sai`, `vì sao sai`, `ví dụ tương đương`, `lỗi người Việt hay gặp`.

## Không làm ở MVP
- Không làm xã hội hoá kiểu forum/chat room.
- Không làm marketplace giáo viên.
- Không làm LMS đầy đủ với authoring phức tạp.
- Không làm 3 ngôn ngữ cùng lúc.
- Không hứa điểm thi thật nếu chưa có dữ liệu chuẩn hóa đủ lớn.

## Kiến trúc AI tutor
- `System prompt`: vai trò, phong cách dạy, giới hạn an toàn, format đầu ra.
- `Language pack`: JA/ZH/KO riêng, mỗi pack có exam map, error map, rubric.
- `Learner profile`: mục tiêu, level, lỗi phổ biến, lịch SRS, lịch sử tương tác.
- `Retrieval layer`: chỉ nạp tài liệu chính thức, glossary, item bank, explanation templates.
- `Generation layer`: sinh gợi ý, bài tập, feedback, ví dụ.
- `Grading layer`: tách riêng chấm objective vs subjective; subjective luôn có kiểm tra mẫu.
- `Memory`: lưu tóm tắt ngắn, không giữ raw chat dài hạn mặc định.

## Lỗi người Việt cần “Vietnamese-first” hoá
- Nhật: particle, kính ngữ, chia động từ, đọc kanji.
- Trung: thanh điệu, chữ Hán, classifier, từ đa âm.
- Hàn: đuôi câu, kính ngữ, spacing, phụ âm cuối, nghe nói tốc độ nhanh.
- Mẫu giải thích nên luôn so với tiếng Việt, tránh giải thích bằng thuật ngữ ngôn ngữ học nặng.

## AI evaluation strategy
- Tạo `golden set` 200-500 câu hỏi theo level, skill, ngôn ngữ, và lỗi người Việt.
- Chạy `prompt regression` mỗi lần đổi prompt / model / rubric.
- Chấm `objective` tự động, `subjective` bằng rubric + human review mẫu.
- Đo `agreement` giữa AI và giáo viên trên speaking/writing.
- Đo `hallucination rate`, `item defect rate`, `cost per successful practice`, `latency p95`.
- Có red-team cho prompt injection, lộ dữ liệu cá nhân, và nội dung không phù hợp cho minors.

## Rủi ro và giảm thiểu
| Rủi ro | Tác động | Giảm thiểu |
|---|---|---|
| Lý thuyết hoá quá mức | Học viên bỏ dở | Bài ngắn, feedback ngay, tiến bộ nhìn thấy được |
| AI bịa luật ngữ pháp | Mất niềm tin | Chỉ trả lời từ retrieval, gắn cảnh báo khi không chắc |
| Launch 3 ngôn ngữ cùng lúc | Trễ MVP, QA vỡ | Rollout theo thứ tự, dùng core chung |
| Chấm speaking/writing sai | Sai định hướng học | Human review mẫu, rubric chặt, lưu phiên bản prompt |
| Dữ liệu trẻ vị thành niên | Rủi ro pháp lý | Age gate, parental consent khi cần, tối thiểu hoá dữ liệu |

## Cost và privacy
- Tách model: model nhỏ cho gợi ý/bài tập, model mạnh chỉ cho chấm khó.
- Cache nội dung bất biến: đề chuẩn, rubric, glossary, template.
- Cắt ngắn context bằng summary thay vì nhét toàn bộ lịch sử.
- Với minors, policy phải theo hướng bảo thủ: không thu thập quá mức, không giữ dữ liệu dư thừa, không cho phép workflow vượt quyền. OpenAI privacy policy nêu dịch vụ không dành cho trẻ dưới 13 và người dưới 18 cần quyền của cha/mẹ/người giám hộ; usage policies nhấn mạnh bảo vệ trẻ vị thành niên. [OpenAI privacy](https://openai.com/policies/row-privacy-policy/), [usage policies](https://openai.com/policies/usage-policies/).

## Success metrics
- `Activation`: >70% người mới hoàn thành placement + 1 bài đầu trong 10 phút.
- `Retention`: D7/D30 phải tốt hơn baseline hiện tại của cohort thử nghiệm.
- `Learning`: tăng điểm post-test so với pre-test trên cùng kỹ năng.
- `Quality`: >95% item QA pass, speaking/writing agreement đạt ngưỡng đã định trước.
- `Economics`: cost / active learner / day nằm trong ngân sách mục tiêu.

## Kết luận
- Chọn `Japanese-first, exam-aligned, Vietnamese-first`.
- Tách AI tutor thành core chung + language packs + eval suite.
- Mở rộng sang Chinese sau khi engine ổn; Korean là vertical kế tiếp, không phải đồng thời.
- Nếu muốn nhanh hơn, cắt thêm scope chứ không mở thêm ngôn ngữ.

## Unresolved questions
- Tỷ trọng nhu cầu thực tế giữa JLPT, HSK, TOPIK trong tệp người dùng mục tiêu chưa được đo.
- Có cần tối ưu cho thiếu niên hay chỉ người lớn mới quyết định chính sách dữ liệu và parental consent.
- Cần baseline dữ liệu nào để đặt ngưỡng chấm speaking/writing đủ tin cậy.
