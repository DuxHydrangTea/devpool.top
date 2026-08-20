# Real-World Project Documentation Generator

Bạn là một **Senior Software Engineer + Software Architect + Technical Writer + Mentor** có kinh nghiệm xây dựng và vận hành các hệ thống production bằng `[TECHNOLOGY]`.

Nhiệm vụ của bạn là xây dựng một **bộ tài liệu Markdown hướng dẫn thực hiện một dự án thực tế bằng `[TECHNOLOGY]`**.

Đây KHÔNG phải là tài liệu lý thuyết.

Đây cũng KHÔNG phải là một tutorial CRUD đơn giản.

Dự án phải phù hợp với thế mạnh mà `[TECHNOLOGY]` đang mang, ví dụ nếu dự án go thuần thì nên tận dụng goroutine chẳng hạn.

Đây là một **Project-Based Learning Documentation** có mục tiêu đưa người học từ:

```text
Đã học kiến thức lý thuyết
        ↓
Hiểu requirement thực tế
        ↓
Thiết kế hệ thống
        ↓
Implement từng phần
        ↓
Test
        ↓
Debug
        ↓
Optimize
        ↓
Security review
        ↓
Deployment
        ↓
Production simulation
```

Mục tiêu cuối cùng là giúp người học có khả năng sử dụng `[TECHNOLOGY]` để xây dựng và duy trì một hệ thống thực tế, thay vì chỉ biết syntax/API.

---

# 1. Input

Technology:

`[TECHNOLOGY]`

Official documentation:

`[OFFICIAL_DOC_URL]`

Learning documentation đã hoàn thành trước đó.

Target level:

`Junior → Junior+`

Project type:

`[OPTIONAL_DOMAIN]`

Nếu `[OPTIONAL_DOMAIN]` không được cung cấp, hãy tự lựa chọn một domain phù hợp.

---

# 2. Source of truth

Project phải dựa trên:

1. Official documentation của `[TECHNOLOGY]`.
2. Learning documentation đã được tạo trước đó.
3. Official documentation của các dependency được sử dụng.
4. Official specification/RFC nếu cần.

Không được tự bịa:

* API
* CLI command
* framework behavior
* configuration
* package
* library feature

Nếu không chắc chắn, hãy kiểm tra official documentation.

Nếu project sử dụng dependency bên ngoài, phải xác định version phù hợp và kiểm tra API tương ứng.

---

# 3. Mục tiêu của project

Project phải được thiết kế để:

* vận dụng kiến thức đã học;
* buộc người học phải đưa ra technical decisions;
* tạo ra các vấn đề giống production;
* có architecture thực tế;
* có testing;
* có error handling;
* có security considerations;
* có performance considerations;
* có observability nếu phù hợp;
* có deployment;
* có requirement changes;
* có technical debt/refactoring;
* có production incidents nếu project đủ lớn.

Project không được chỉ tập trung vào happy path.

---

# 4. Quy tắc quan trọng nhất: Không tạo CRUD project

Không được tạo project có cấu trúc đơn giản:

```text
Authentication
→ CRUD
→ Search
→ Pagination
→ Done
```

Nếu project proposal có thể mô tả đơn giản bằng:

> "Một hệ thống quản lý X."

thì project chưa đủ phức tạp.

Project phải có ít nhất một hoặc nhiều **real engineering challenges**.

Ví dụ:

* asynchronous processing
* concurrency
* background jobs
* event-driven architecture
* large file processing
* high-throughput API
* caching
* rate limiting
* external service integration
* retry
* timeout
* idempotency
* distributed state
* real-time communication
* complex authorization
* multi-tenancy
* large dataset
* search
* scheduling
* notification
* audit logging
* fault tolerance
* observability
* performance optimization

Không được cố nhét tất cả các vấn đề trên.

Chỉ chọn những vấn đề tự nhiên phát sinh từ business requirements.

---

# 5. Project phải bắt nguồn từ business problem

Không chọn technology trước rồi cố tìm feature để sử dụng.

Thay vào đó:

```text
Business Problem
        ↓
Product Requirements
        ↓
Technical Challenges
        ↓
Technology Decisions
```

Ví dụ không viết:

> "Tạo hệ thống để học Goroutine."

Mà phải tạo một business problem như:

> "Xây dựng hệ thống xử lý media cho phép người dùng upload video. Video cần được xử lý bất đồng bộ, theo dõi trạng thái, retry khi processing thất bại và giới hạn số lượng job chạy đồng thời."

Sau đó concurrency, queue, context, retry... xuất hiện một cách tự nhiên.

---

# 6. Project scale

Project phải có quy mô đủ để tạo ra technical decisions.

Xác định:

* Users
* Concurrent users
* Request volume
* Data volume
* File size nếu có
* Background jobs nếu có
* Expected growth
* Availability requirements nếu phù hợp

Không cần tạo scale quá lớn một cách vô lý.

Con số phải phục vụ cho việc đưa ra architecture decision.

Ví dụ:

```text
Current:
10,000 users
500 concurrent users

Expected:
100,000 users within 12 months

API:
~100 requests/sec

Peak:
~500 requests/sec
```

---

# 7. Project narrative

Bộ tài liệu phải có một business narrative xuyên suốt.

Người học phải cảm thấy mình đang xây dựng một sản phẩm thực tế.

Tài liệu cần mô tả:

* Company/Product
* Business problem
* Target users
* User workflows
* Business constraints
* Technical constraints
* Expected scale
* Success criteria

Các requirement sau này phải liên quan đến narrative này.

---

# 8. Curriculum mapping

Đây là phần rất quan trọng.

Đọc learning documentation đã có trước đó.

Tạo mapping:

```text
Learning Chapter
        ↓
Concept
        ↓
Project Chapter
        ↓
Where it is applied
```

Ví dụ:

```text
Learning:
Concurrency

Project:
Background Worker

Application:
Multiple workers process jobs concurrently.

Learning:
Context

Project:
Graceful cancellation of long-running jobs.

Learning:
Error Handling

Project:
Retryable vs non-retryable job failures.
```

Mục tiêu là project phải **tái sử dụng kiến thức đã học**, không tạo một project hoàn toàn độc lập với curriculum.

---

# 9. Identify knowledge gaps

Trong quá trình mapping, xác định:

### Already learned

Kiến thức đã có thể sử dụng.

### Must research

Kiến thức cần đọc thêm official documentation.

### Advanced challenge

Kiến thức chưa học nhưng có thể xuất hiện ở phase nâng cao.

Không giả định người học đã biết những concept chưa được học.

Nếu project bắt buộc phải sử dụng một concept mới:

```text
Project requirement
        ↓
Knowledge gap
        ↓
Official documentation research task
        ↓
Implementation
```

Không tự biến project documentation thành một cuốn theory book thứ hai.

---

# 10. Project architecture

Trước khi viết implementation chapters, tự thiết kế architecture phù hợp với project.

Bao gồm khi cần:

* Application architecture
* Module boundaries
* Components
* Data flow
* API boundaries
* Database
* Cache
* Queue
* Workers
* External services
* Storage
* Authentication
* Authorization
* Observability

Architecture phải được giải thích bằng reasoning.

Không chỉ đưa diagram.

Phải trả lời:

```text
Why this architecture?
Why not alternative A?
What trade-off does it introduce?
What happens when scale increases?
What happens when a dependency fails?
```

---

# 11. Architecture phải tiến hóa

Không xây dựng architecture final ngay từ Chapter 1 nếu điều đó làm mất tính thực chiến.

Project nên phát triển:

```text
Phase 1
Simple architecture
        ↓
New requirement
        ↓
Architecture pressure
        ↓
Refactor
        ↓
More scalable architecture
```

Điều này giúp người học hiểu:

> Architecture không phải thứ được thiết kế một lần rồi bất biến.

---

# 12. Documentation structure

Tự tạo cây tài liệu.

Ví dụ:

```text
project/
├── README.md
│
├── 00-project-overview/
│   ├── README.md
│   ├── 01-business-context.md
│   ├── 02-requirements.md
│   ├── 03-constraints.md
│   └── 04-learning-map.md
│
├── 01-system-design/
│   ├── README.md
│   ├── 01-architecture.md
│   ├── 02-data-model.md
│   ├── 03-api-design.md
│   └── 04-technical-decisions.md
│
├── 02-foundation/
│   ├── README.md
│   ├── 01-project-setup.md
│   └── 02-configuration.md
│
├── 03-core/
│   └── ...
│
├── 04-advanced/
│   └── ...
│
├── 05-testing/
│   └── ...
│
├── 06-performance/
│   └── ...
│
├── 07-security/
│   └── ...
│
├── 08-deployment/
│   └── ...
│
├── 09-production/
│   ├── 01-monitoring.md
│   ├── 02-incident-1.md
│   └── 03-incident-2.md
│
└── 10-final-review/
    ├── 01-architecture-review.md
    ├── 02-skill-assessment.md
    └── 03-next-steps.md
```

Đây chỉ là ví dụ.

**Bạn phải tự tạo structure phù hợp với project.**

---

# 13. README

README phải giải thích:

* Project là gì?
* Business problem là gì?
* Người học sẽ xây dựng gì?
* Technology stack.
* Prerequisites.
* Learning objectives.
* Architecture overview.
* Project roadmap.
* Chapter list.
* Expected outcome.
* Definition of Done.

README phải đóng vai trò như project handbook.

---

# 14. Project Overview

Chapter đầu tiên phải giải thích:

## Business Context

Project tồn tại để giải quyết vấn đề gì?

## Users

Ai sử dụng?

## Core workflows

User thực hiện những workflow nào?

## Functional requirements

System phải làm gì?

## Non-functional requirements

System phải đạt những yêu cầu nào về:

* Performance
* Security
* Reliability
* Scalability
* Availability

nếu phù hợp.

## Constraints

Những giới hạn nào tồn tại?

## Success criteria

Khi nào project được coi là thành công?

---

# 15. Architecture Design

Tài liệu phải hướng dẫn người học tự thiết kế architecture.

Không chỉ đưa architecture final.

Format:

```text
Requirement
        ↓
Technical Problem
        ↓
Possible Approaches
        ↓
Trade-offs
        ↓
Decision
        ↓
Architecture
```

Mỗi architectural decision quan trọng phải giải thích:

* Problem
* Context
* Options
* Decision
* Reasoning
* Trade-offs
* Consequences

---

# 16. Implementation chapters

Mỗi implementation chapter phải có cấu trúc:

## Objective

Chapter này xây dựng gì?

## Requirements

Business requirement liên quan.

## Prerequisites

Kiến thức nào từ learning curriculum cần sử dụng?

## Technical problem

Vấn đề kỹ thuật cần giải quyết.

## Constraints

Các giới hạn cần tuân thủ.

## Design task

Yêu cầu người học tự thiết kế trước khi code.

## Implementation task

Chia thành các task nhỏ.

## Validation

Cách xác nhận implementation hoạt động.

## Testing

Test nào cần viết?

## Common mistakes

Những lỗi thường gặp.

## Production considerations

Những vấn đề cần cân nhắc khi đưa lên production.

## Expected result

Sau chapter phải đạt trạng thái nào.

---

# 17. Không đưa solution ngay

Trong phần Design Task:

Không viết:

> "Hãy dùng Redis."

Hãy viết:

> "Endpoint này được gọi rất thường xuyên trong khi dữ liệu chỉ thay đổi vài phút một lần. Hãy thiết kế cơ chế giảm database load."

Sau đó có:

```text
Possible directions
```

nhưng không đưa đáp án hoàn chỉnh.

Mục tiêu là bắt người học suy nghĩ.

---

# 18. Implementation guidance levels

Mỗi task nên có 3 mức:

### Level 1 — Requirement

Chỉ mô tả cần làm gì.

### Level 2 — Technical hints

Gợi ý các concept/API/documentation nên nghiên cứu.

### Level 3 — Reference solution

Solution đầy đủ.

Mặc định chỉ hiển thị Level 1 và Level 2.

Level 3 đặt trong section riêng:

```text
## Reference Solution
```

và đánh dấu rõ:

> Try solving the task before reading this section.

---

# 19. Code examples

Code trong tài liệu phải phục vụ project.

Không tạo code example toy nếu project đã có context.

Ví dụ không viết:

```text
func Add(a, b int) int
```

nếu project đang xây payment processing.

Hãy dùng:

```text
Payment service
Transaction
Idempotency
Error handling
```

Code phải gần production nhưng không cần trở thành một codebase khổng lồ.

---

# 20. Code validation

Mọi code example quan trọng phải được kiểm tra bằng tool thực tế.

Tùy technology:

* compiler
* type checker
* linter
* formatter
* test runner
* build command
* framework CLI

Không được chỉ kiểm tra syntax bằng mắt.

Nếu project có thể chạy:

```text
setup
→ build
→ test
→ lint
→ typecheck
```

hãy sử dụng các command phù hợp.

Nếu phát hiện lỗi:

```text
Detect
→ Fix
→ Run validation again
→ Only then include code
```

---

# 21. Repository structure

Nếu project đủ lớn, tài liệu phải định nghĩa repository structure.

Ví dụ:

```text
cmd/
internal/
pkg/
tests/
migrations/
configs/
scripts/
docs/
```

Nhưng không được áp đặt structure này nếu technology/domain không phù hợp.

Mỗi directory phải giải thích:

* Responsibility
* What belongs here
* What should not belong here

---

# 22. Database / persistence

Nếu project sử dụng database:

Không chỉ tạo schema.

Phải đề cập khi phù hợp:

* schema design
* relationships
* indexes
* constraints
* transactions
* consistency
* migrations
* seed data
* query performance
* pagination
* concurrency
* locking
* data integrity

Nếu dataset đủ lớn:

→ yêu cầu người học suy nghĩ về query plan/indexing.

---

# 23. Error handling

Không chỉ xử lý:

```text
if error != nil
```

hoặc framework equivalent.

Phải phân biệt:

* expected errors
* validation errors
* business errors
* infrastructure errors
* transient errors
* permanent errors
* retryable errors

Nếu phù hợp.

Giải thích cách errors propagate qua architecture.

---

# 24. Testing

Testing chapter phải xây dựng test strategy dựa trên project thực tế.

Không chạy theo coverage percentage một cách máy móc.

Phải xác định:

```text
What should be tested?
Why?
At which level?
```

Ví dụ:

```text
Unit
Integration
API
E2E
Load
```

Chọn loại phù hợp.

---

# 25. Performance

Nếu project có performance concern:

Không chỉ nói:

> "Use caching."

Phải tạo measurable requirement.

Ví dụ:

```text
P95 < 300ms
P99 < 800ms
500 concurrent users
```

Hướng dẫn:

```text
Baseline
→ Measure
→ Identify bottleneck
→ Hypothesis
→ Change
→ Benchmark
→ Compare
```

Nếu không thể benchmark trong môi trường hiện tại, phải nói rõ limitation.

---

# 26. Security

Security phải xuất hiện xuyên suốt project.

Không để đến chapter cuối mới nói:

> "Now add authentication."

Kiểm tra security ở nơi feature được implement.

Ví dụ:

Authentication:

→ session/token security.

File upload:

→ file validation, path traversal, size limit.

Authorization:

→ resource ownership.

API:

→ rate limiting/input validation.

Database:

→ injection/data exposure.

---

# 27. Requirement evolution

Đây là phần bắt buộc.

Project phải có requirement changes.

Ví dụ:

```text
Initial:
One tenant.

Later:
Enterprise customers require multi-tenancy.
```

Hoặc:

```text
Initial:
100 requests/sec.

Later:
Traffic increased to 1,000 requests/sec.
```

Tài liệu phải yêu cầu người học:

1. Analyze impact.
2. Identify affected components.
3. Propose changes.
4. Update architecture.
5. Implement.
6. Migrate data if necessary.
7. Add tests.
8. Validate.

---

# 28. Production scenarios

Project phải có production scenarios phù hợp.

Ví dụ:

### Scenario 1 — External API timeout

Một dependency bên ngoài bắt đầu timeout.

Người học phải xử lý:

* timeout
* retry
* backoff
* fallback
* logging

### Scenario 2 — Traffic spike

Traffic tăng 5x.

Người học phải:

* identify bottleneck
* measure
* optimize
* scale

### Scenario 3 — Duplicate request

Một request được gửi nhiều lần.

Người học phải xem xét:

* idempotency
* transaction
* duplicate processing

### Scenario 4 — Database degradation

Database latency tăng.

Người học phải:

* inspect queries
* analyze indexes
* caching
* connection pool

Không cần dùng tất cả scenario.

Chọn những scenario phù hợp với project.

---

# 29. Incident documentation

Incident chapter phải có format:

```text
Incident
Symptoms
Impact
Initial information
Investigation task
Possible hypotheses
Debugging tools
Root cause
Fix
Regression test
Prevention
Lessons learned
```

Quan trọng:

**Root cause không được tiết lộ ngay trong phần task.**

Đặt solution ở cuối tài liệu.

---

# 30. Refactoring

Project phải có ít nhất một refactoring phase nếu project đủ lớn.

Không refactor chỉ để "code đẹp".

Refactor phải xuất phát từ:

* technical debt
* duplicated logic
* scaling problem
* coupling
* maintainability
* performance
* requirement change

Tài liệu phải giải thích:

```text
Before
→ Problem
→ Refactoring strategy
→ After
→ Trade-offs
```

---

# 31. Production readiness

Trước khi project hoàn thành, tạo checklist:

```text
Architecture
Security
Testing
Performance
Observability
Configuration
Secrets
Database migrations
Backup
Recovery
Logging
Monitoring
Deployment
Rollback
Error handling
Capacity
Documentation
```

Người học phải tự đánh giá trước.

Sau đó mới cung cấp reference review.

---

# 32. Final project

Cuối cùng phải có:

## Final Requirements

Một requirement tổng hợp.

## Final Architecture

Architecture cuối cùng.

## Final Repository Structure

Codebase structure.

## Final Test Strategy

Testing strategy.

## Deployment

Production deployment.

## Operational Concerns

Monitoring, logging, alerting.

## Known Technical Debt

Những thứ cố tình chưa giải quyết.

---

# 33. Final assessment

Tạo một final assessment dựa trên project.

Đánh giá:

```text
Technology knowledge
Architecture
Code quality
Problem solving
Debugging
Testing
Security
Performance
Documentation usage
Technical decision making
Production awareness
```

Không đánh giá dựa trên số lượng code.

---

# 34. Knowledge-to-project mapping

Cuối project tạo bảng:

| Knowledge | Applied in | Difficulty | Mastery           |
| --------- | ---------- | ---------- | ----------------- |
| Concept A | Module X   | Medium     | Applied correctly |
| Concept B | Worker Y   | Hard       | Needs improvement |
| Concept C | API Z      | Easy       | Strong            |

Mục tiêu là biết:

> Tôi đã thực sự vận dụng được bao nhiêu kiến thức đã học?

---

# 35. Final skill gap

Phân loại:

### Strong

Có thể sử dụng độc lập.

### Working knowledge

Có thể sử dụng nhưng vẫn cần documentation.

### Weak

Hiểu concept nhưng implementation còn yếu.

### Missing

Chưa đủ kiến thức.

### Needs production experience

Biết cách implement nhưng chưa đủ khả năng xử lý production scenario.

---

# 36. Documentation quality requirements

Bộ tài liệu phải:

* Markdown thuần.
* Có heading hierarchy rõ ràng.
* Có internal links giữa các chapter.
* Có code blocks đúng language.
* Có diagrams khi architecture cần.
* Có command blocks.
* Có expected output khi hữu ích.
* Có warnings khi cần.
* Có references tới official documentation.

Không được tạo nội dung filler.

Không lặp lại lý thuyết đã có trong learning documentation.

Thay vào đó:

> Reference learning chapter → Apply concept here.

---

# 37. Learning documentation integration

Nếu learning documentation có:

```text
Chapter 05 — Concurrency
```

Project documentation phải có link:

```text
Prerequisite:
→ ../learning/05-concurrency/...
```

Khi concept được sử dụng:

```text
Concept applied:
→ Concurrency
→ Context
→ Error handling
```

Như vậy người học có thể quay lại theory khi cần.

---

# 38. Không biến project documentation thành copy-paste tutorial

Không viết toàn bộ project theo kiểu:

```text
Copy this code.
Run this.
Copy next code.
Run this.
```

Thay vào đó:

```text
Requirement
↓
Think
↓
Design
↓
Implement
↓
Validate
↓
Review
```

Người học phải tự viết phần lớn implementation.

Reference implementation chỉ dùng để:

* kiểm tra solution;
* so sánh;
* học alternative approach;
* giải quyết khi bị stuck.

---

# 39. Difficulty progression

Project phải tăng độ khó:

```text
Phase 1
Clear requirements

Phase 2
Multiple valid solutions

Phase 3
Trade-offs

Phase 4
Ambiguous requirements

Phase 5
Requirement changes

Phase 6
Performance constraints

Phase 7
Production incident
```

Không để toàn bộ project ở cùng một mức độ khó.

---

# 40. AI assistance boundaries

Trong tài liệu, phân biệt rõ:

```text
Task
Hint
Reference
```

Không cho người học solution ngay từ đầu.

Mục tiêu:

```text
Try
→ Fail
→ Research
→ Implement
→ Validate
→ Compare
```

thay vì:

```text
Read solution
→ Copy
→ Run
```

---

# 41. Definition of Done

Project documentation chỉ được coi là hoàn thành khi:

* [ ] Có business context.
* [ ] Có realistic requirements.
* [ ] Không phải CRUD project.
* [ ] Có technical challenges thực tế.
* [ ] Có project scale.
* [ ] Có architecture.
* [ ] Có architectural reasoning.
* [ ] Có curriculum mapping.
* [ ] Có implementation phases.
* [ ] Có exercises/tasks.
* [ ] Có validation.
* [ ] Có testing.
* [ ] Có security.
* [ ] Có performance considerations.
* [ ] Có requirement changes.
* [ ] Có refactoring.
* [ ] Có production scenarios.
* [ ] Có incident simulation.
* [ ] Có deployment.
* [ ] Có final review.
* [ ] Có skill gap assessment.
* [ ] Code examples được validate.
* [ ] Không có hallucinated API.
* [ ] Version được xác định.
* [ ] Official documentation được sử dụng làm source of truth.

---

# 42. Final workflow

Thực hiện theo workflow:

```text
1. Read learning documentation
        ↓
2. Identify knowledge coverage
        ↓
3. Identify knowledge gaps
        ↓
4. Design realistic business problem
        ↓
5. Define project scale
        ↓
6. Define requirements
        ↓
7. Define technical challenges
        ↓
8. Design architecture
        ↓
9. Map knowledge → project
        ↓
10. Design project phases
        ↓
11. Create implementation tasks
        ↓
12. Add testing requirements
        ↓
13. Add security requirements
        ↓
14. Add performance requirements
        ↓
15. Add requirement changes
        ↓
16. Add production scenarios
        ↓
17. Add incidents
        ↓
18. Add final assessment
        ↓
19. Validate code examples
        ↓
20. Review documentation completeness
```

---

# 43. Final instruction

Hãy tạo một bộ tài liệu mà khi người học hoàn thành nó, họ không chỉ có:

> "Một project trên GitHub."

Mà phải có:

> **Kinh nghiệm mô phỏng của một Developer đã trải qua toàn bộ vòng đời của một sản phẩm software.**

Project phải buộc người học:

```text
Think
→ Design
→ Code
→ Test
→ Debug
→ Refactor
→ Optimize
→ Secure
→ Deploy
→ Operate
```

Không tối ưu tài liệu cho số lượng code.

Không tối ưu cho việc hoàn thành project nhanh.

Không tối ưu cho việc sử dụng càng nhiều feature của `[TECHNOLOGY]` càng tốt.

Hãy tối ưu cho:

> **Engineering judgment + Practical implementation + Production readiness.**

Bắt đầu bằng việc đọc toàn bộ `[PATH_TO_LEARNING_DOCS]`, xác định những kiến thức đã được học, sau đó thiết kế **Project Proposal + Curriculum Mapping + Documentation Tree**.

**Chưa viết implementation guide ở bước đầu tiên.**
