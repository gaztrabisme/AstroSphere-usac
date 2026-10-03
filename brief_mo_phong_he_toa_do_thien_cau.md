# BRIEF: Web mô phỏng hệ tọa độ thiên cầu (tiếng Việt)

## 1. Phân tích ảnh mẫu

Ảnh mẫu là **Rotating Sky Explorer** của NAAP (Đại học Nebraska–Lincoln). Phần dưới đây mô tả theo ảnh; các tùy chọn ẩn (ví dụ menu "animate") chỉ là suy đoán.

**Hai khung nhìn đồng bộ**
- **Thiên cầu (trái):** Trái Đất ở tâm, chấm trắng là người quan sát (40,8°N, 96,7°W). Có trục thiên cực (xanh), xích đạo trời (vàng) và vòng giờ 0h (xám).
- **Giản đồ chân trời (phải):** Người quan sát ở tâm mặt phẳng chân trời xanh lá, có nhãn N/E/S/W. Xích đạo trời nghiêng một góc so với chân trời, có thể xem cả mặt dưới chân trời.

**Bốn bảng điều khiển phía dưới**
- **Vị trí quan sát:** ô nhập vĩ độ/kinh độ (kèm N/S, E/W) và bản đồ thế giới bấm để chọn.
- **Hoạt ảnh:** nút bắt đầu, chế độ chạy, thanh tốc độ.
- **Hiển thị:** các hộp kiểm (nhãn, vòng 0h, xích đạo trời, mặt dưới chân trời, vùng không bao giờ mọc, vùng mọc-lặn, vùng không bao giờ lặn, góc giữa xích đạo trời và chân trời).
- **Điều khiển sao:** mẫu chòm sao, thêm sao ngẫu nhiên, xóa sao, vết sao (không/ngắn/dài), đặt lại vết sao.

**Thanh trên cùng:** đặt lại, trợ giúp, giới thiệu.

## 2. Mục tiêu sản phẩm

Một web app tĩnh, **hoàn toàn tiếng Việt**, giúp học sinh và sinh viên hiểu trực quan:
1. Vì sao bầu trời "quay" và độ cao thiên cực bằng vĩ độ người quan sát.
2. Mối liên hệ giữa hệ tọa độ **xích đạo** (α, δ, H) và hệ **chân trời** (A, h).
3. Sao nào mọc-lặn, sao nào không bao giờ lặn (cận cực), sao nào không bao giờ mọc, tùy vĩ độ.

**Phạm vi**
- **MVP:** tái hiện đầy đủ chức năng ở mục 1.
- **Mở rộng:** hệ hoàng đạo, hệ thiên hà, Mặt Trời theo ngày, chế độ bài tập.

## 3. Cơ sở toán học (phần lõi, cần chính xác)

**Quy ước:** vĩ độ φ (Bắc +), kinh độ λ (Đông +), xích kinh α, xích vĩ δ, góc giờ H. Phương vị A tính từ Bắc về Đông, độ cao h.

- **Thời gian thiên văn địa phương:** `LST = GST + λ`
- **Góc giờ:** `H = LST − α`
- **Độ cao:** `sin h = sin φ · sin δ + cos φ · cos δ · cos H`
- **Phương vị:** `A = atan2(−cos δ · sin H, sin δ · cos φ − cos δ · cos H · sin φ)`, chuẩn hóa về [0°, 360°)
- **Độ cao thiên cực** = |φ|. **Góc nghiêng xích đạo trời so với chân trời** = 90° − |φ|.
- **Phân loại sao** (với φ ≥ 0; φ < 0 thì đối xứng):
  - Không bao giờ lặn (cận cực): δ > 90° − φ
  - Không bao giờ mọc: δ < −(90° − φ)
  - Mọc-lặn: các trường hợp còn lại
- **Góc giờ lúc mọc/lặn:** `cos H₀ = −tan φ · tan δ`. Thời gian sao ở trên chân trời = 2H₀/15 giờ thiên văn.
- **Tốc độ quay:** 360° / 23h 56m 04s (ngày thiên văn), không phải 24h.
- **Tọa độ Descartes:** `x = cos δ · cos α`, `y = cos δ · sin α`, `z = sin δ`. Quay quanh trục z một góc LST, sau đó quay quanh trục Đông–Tây một góc (90° − φ) để sang hệ chân trời.
- **Mở rộng (hoàng đạo):** độ nghiêng ε = 23,44°, dùng ma trận quay quanh trục x.

## 4. Kiến trúc kỹ thuật

- **Công nghệ:** Vite + TypeScript + **Three.js** cho 2 canvas WebGL. Giao diện thuần HTML/CSS, hoặc Preact/React nếu muốn.
- **Cấu trúc module:**
  - `astro/`: toán thuần, không phụ thuộc UI, có unit test
  - `scene/`: celestialSphere, horizonDiagram
  - `ui/`: các bảng điều khiển
  - `data/`: sao, chòm sao
  - `i18n/vi.json`
- **Một nguồn trạng thái duy nhất:** `{ lat, lon, lst, playing, rate, toggles, stars[], trails }`. Cả hai khung nhìn chỉ render từ state này nên luôn đồng bộ.
- **Camera:** OrbitControls ở cả hai khung (kéo xoay, cuộn để zoom, hỗ trợ cảm ứng).
- **Vết sao:** lưu lịch sử vị trí theo LST, vẽ bằng `Line` với độ mờ giảm dần. Hai độ dài (ngắn/dài) và nút đặt lại.
- **Vùng tô màu** (không mọc / mọc-lặn / cận cực): dùng mặt chỏm cầu hoặc dải màu bán trong suốt trên thiên cầu, tính theo δ giới hạn ở mục 3.
- **Dữ liệu sao:** bộ con của HYG hoặc Yale BSC (~500–1500 sao sáng nhất), kèm đường nối chòm sao từ d3-celestial (giấy phép BSD).
- **Bản quyền:** **không copy mã hay tài nguyên của NAAP**, chỉ lấy ý tưởng.

## 5. Chức năng chi tiết

### 5.1 Vị trí quan sát
- Nhập vĩ độ/kinh độ; bấm hoặc kéo trên bản đồ (dùng ảnh/SVG nội bộ, không phụ thuộc mạng).
- Kiểm tra giá trị: vĩ độ trong [−90, 90], kinh độ trong [−180, 180].
- **Nút nhanh cho Việt Nam:** Hà Nội (21,03°N; 105,85°E), Huế, Đà Nẵng, TP.HCM (10,82°N; 106,63°E), Cà Mau, Trường Sa, Hoàng Sa.
- Thêm Xích đạo, Bắc Cực, Nam Cực để thấy các trường hợp biên.

### 5.2 Hoạt ảnh
- Bắt đầu/Tạm dừng, thanh tốc độ (ví dụ 1 ngày thiên văn trong 5–60 giây).
- Chế độ: chạy liên tục, chạy 1 ngày rồi dừng, bước theo giờ.
- Kéo thanh trượt "Giờ thiên văn" để quay bằng tay.

### 5.3 Hiển thị
- Tất cả hộp kiểm ở mục 1.
- Thêm: mặt phẳng và trục thiên cực, thiên đỉnh/thiên để, kinh tuyến thiên cầu, đường thẳng đứng.
- **Nhãn** bật/tắt riêng cho từng nhóm.

### 5.4 Điều khiển sao
- Thêm sao ngẫu nhiên, hoặc nhập (α, δ) để thêm sao.
- **Bấm vào sao** hiện thẻ thông tin: α, δ, H, A, h, trạng thái (cận cực / mọc-lặn / không mọc), giờ mọc-lặn.
- Mẫu chòm sao tiếng Việt: Đại Hùng (Gấu Lớn), Tiểu Hùng + sao Bắc Cực, Thiên Hậu (Cassiopeia), Thợ Săn (Orion), Nam Thập Tự (Crux), Thần Nông (Scorpius), Thiên Nga…
- Xóa tất cả, vết sao (không/ngắn/dài), đặt lại vết.

### 5.5 Bảng số liệu trực tiếp
φ, λ, LST, và tọa độ của sao đang chọn ở cả hai hệ, cập nhật theo thời gian thực.

### 5.6 Chế độ học tập (nên có)
- Các "nhiệm vụ" ngắn, ví dụ:
  - *"Đặt vị trí ở Hà Nội: sao Bắc Cực cao bao nhiêu độ?"*
  - *"Ở xích đạo, sao nào không bao giờ lặn?"*
  - *"Tìm vĩ độ để Nam Thập Tự là cận cực."*
- Quiz có chấm điểm tự động và gợi ý.

### 5.7 Mở rộng sau MVP
Hệ hoàng đạo và Mặt Trời theo ngày trong năm (hiểu mùa, hạ chí/đông chí), hệ thiên hà, Mặt Trăng và các hành tinh qua `astronomy-engine`.

## 6. Thuật ngữ Việt hóa (bảng i18n)

| Anh | Việt |
|---|---|
| Celestial sphere | Thiên cầu |
| Celestial equator | Xích đạo trời |
| Celestial poles | Cực thiên cầu (Bắc/Nam) |
| Horizon | Đường/mặt phẳng chân trời |
| Zenith / Nadir | Thiên đỉnh / Thiên để |
| Meridian | Kinh tuyến thiên cầu |
| Hour circle | Vòng giờ |
| Right ascension | Xích kinh (α) |
| Declination | Xích vĩ (δ) |
| Hour angle | Góc giờ (H) |
| Altitude / Azimuth | Độ cao / Phương vị |
| Circumpolar | Cận cực (không bao giờ lặn) |
| Never rise | Không bao giờ mọc |
| Rise and set | Mọc và lặn |
| Star trails | Vết sao |
| Sidereal time | Thời gian thiên văn |
| Vernal equinox | Điểm xuân phân |
| Ecliptic | Hoàng đạo |

## 7. UI/UX

- Giữ bố cục **2 khung nhìn trên, 4 bảng dưới** trên desktop. Trên điện thoại chuyển thành các tab, bảng điều khiển dạng ngăn kéo.
- Nền tối, màu nhất quán: xích đạo vàng, thiên cực xanh, chân trời xanh lá, vùng mọc/lặn có 3 màu phân biệt kèm chú giải.
- Tooltip giải thích bằng tiếng Việt khi rê chuột vào từng đối tượng, nút "?" mở hướng dẫn.
- Đủ độ tương phản, điều khiển bằng bàn phím, có `aria-label`.

## 8. Tiêu chí nghiệm thu

1. Ở φ = 21,03°N, thiên cực Bắc cao 21,03° trên chân trời, xích đạo trời nghiêng 68,97°.
2. Ở φ = 90°N, mọi sao có δ > 0 đều cận cực. Ở φ = 0°, không có sao cận cực.
3. Sao ở δ = 0° mọc đúng hướng Đông và lặn đúng hướng Tây tại mọi vĩ độ (trừ hai cực).
4. Hai khung nhìn đồng bộ tuyệt đối khi kéo thanh giờ.
5. Sai số A, h so với Stellarium hoặc `astronomy-engine` < 0,1°.
6. Chạy ổn định ≥ 50 FPS với ~1000 sao trên laptop trung bình, ≥ 30 FPS trên điện thoại.
7. Không còn chuỗi tiếng Anh trên giao diện.

## 9. Lộ trình gợi ý

1. **Lõi toán + test:** `astro/`
2. **Giản đồ chân trời + thiên cầu** với các đường cơ bản
3. **Bảng điều khiển + hoạt ảnh**
4. **Sao, chòm sao, vết sao, vùng tô màu**
5. **Việt hóa, chế độ học tập, responsive**
6. **Mở rộng (hoàng đạo, Mặt Trời)**
