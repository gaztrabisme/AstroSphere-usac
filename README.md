# Hệ thống Mô phỏng Hệ toạ độ — CLB Thiên văn USAC

Web app tĩnh, hoàn toàn tiếng Việt, giúp học sinh – sinh viên hiểu trực quan:

1. Vì sao bầu trời "quay" và vì sao độ cao thiên cực bằng vĩ độ người quan sát.
2. Mối liên hệ giữa hệ tọa độ **xích đạo** (α, δ, H) và hệ **chân trời** (A, h).
3. Sao nào mọc – lặn, sao nào không bao giờ lặn (cận cực), sao nào không bao giờ mọc, tùy vĩ độ.

Xây dựng theo `brief_mo_phong_he_toa_do_thien_cau.md` (lấy ý tưởng bố cục từ Rotating Sky Explorer của NAAP, không sao chép mã hay tài nguyên).

## Chạy thử

```bash
npm install
```

```bash
npm run dev
```

| Lệnh | Việc làm |
|---|---|
| `npm run dev` | Máy chủ phát triển Vite |
| `npm run build` | Kiểm tra kiểu (tsc) rồi đóng gói vào `dist/` (đường dẫn tương đối, chạy được trên mọi máy chủ tĩnh) |
| `npm run preview` | Xem thử bản đã đóng gói |
| `npm test` | Chạy unit test (Vitest) |
| `npm run data` | Tạo lại dữ liệu sao/chòm sao/lục địa trong `src/data/generated/` từ các gói npm |

## Chức năng

**Hai khung nhìn 3D luôn đồng bộ** (Three.js, kéo xoay, cuộn/chụm phóng to, hỗ trợ cảm ứng)
- *Thiên cầu*: Trái Đất ở tâm với người quan sát, mặt phẳng chân trời tiếp xúc; bầu trời quay quanh trục thiên cực.
- *Giản đồ chân trời*: người quan sát ở tâm mặt phẳng chân trời với hướng B, Đ, N, T; có chế độ "Nhìn từ người quan sát".

**Bốn bảng điều khiển**
- *Vị trí quan sát*: nhập vĩ độ/kinh độ (kiểm tra miền giá trị), thanh trượt vĩ độ, bản đồ thế giới nội bộ (bấm/kéo, phím mũi tên), nút nhanh Hà Nội, Huế, Đà Nẵng, TP.HCM, Cà Mau, Trường Sa, Hoàng Sa, Xích đạo, Bắc Cực, Nam Cực.
- *Hoạt ảnh*: chạy/tạm dừng; chế độ liên tục, 1 ngày thiên văn rồi dừng, bước theo giờ; tốc độ 5–60 giây cho một ngày thiên văn; thanh "Giờ thiên văn" để quay bằng tay; nút "Bây giờ".
- *Hiển thị*: vòng giờ 0h, xích đạo trời, mặt dưới chân trời, ba vùng tô màu (kèm chú giải), góc xích đạo trời – chân trời, độ cao thiên cực, trục và mặt phẳng xích đạo, thiên đỉnh/thiên để, kinh tuyến, đường thẳng đứng (kèm cung h và A), lưới chân trời và lưới xích đạo; nhãn bật/tắt theo từng nhóm.
- *Điều khiển sao*: 16 mẫu chòm sao (Ursa Major, Ursa Minor + Polaris, Cassiopeia, Orion, Crux, Scorpius, Cygnus…), sao ngẫu nhiên, nhập (α, δ) theo nhiều định dạng, xóa sao, ~1300 sao sáng thật và đường nối 88 chòm sao, vết sao (không / ngắn / dài) và đặt lại vết.

**Quy ước tên**: trên bầu trời, sao và chòm sao ghi theo tên quốc tế (IAU: Sirius, Ursa Major…); tên tiếng Việt (Hán Việt / thuần Việt, theo Wikipedia tiếng Việt "Danh sách chòm sao") chỉ hiện trong thẻ thông tin khi bấm vào. Mặc định khi mở trang chỉ hiện sao thật cùng đường nối và tên 88 chòm sao; thiên thể sâu, hoàng đạo, Mặt Trời, vùng tô màu… người dùng tự bật trong bảng Hiển thị.

**Thẻ thông tin** khi bấm vào sao: α, δ, H, A, h, trạng thái (cận cực / mọc – lặn / không mọc), LST và phương vị lúc mọc, qua kinh tuyến, lặn, thời gian ở trên chân trời. Thẻ kéo được và thu gọn được.

**Bảng số liệu trực tiếp**: φ, λ, LST, GST, độ cao thiên cực, góc xích đạo trời – chân trời, giờ Mặt Trời, tọa độ đối tượng đang chọn ở cả hai hệ.

**Chế độ học tập**: 12 nhiệm vụ (nhập số, trắc nghiệm, thao tác trực tiếp trên mô phỏng) có nút thiết lập, gợi ý, giải thích và chấm điểm; tiến độ lưu trong trình duyệt.

**Mở rộng**: hoàng đạo (điểm xuân phân, hạ chí, thu phân, đông chí), Mặt Trời theo ngày (độ dài ban ngày, nền trời đổi màu theo ngày/đêm), xích đạo thiên hà và tâm Ngân Hà.

**Phím tắt**: `Dấu cách` chạy/dừng · `←`/`→` lùi/tiến 1 giờ · `+`/`−` tốc độ · `N` bây giờ · `V` đặt lại vết · `C` đặt lại góc nhìn · `L` học tập · `H` trợ giúp · `Esc` đóng/bỏ chọn.

## Cấu trúc

```
src/
  astro/        Toán thuần, không phụ thuộc giao diện (có unit test)
    math.ts       lượng giác theo độ, ma trận quay
    time.ts       GMST (IAU 1982), LST = GST + λ, ngày thiên văn
    coords.ts     xích đạo ↔ chân trời (công thức và ma trận quay)
    visibility.ts phân loại sao, cos H₀ = −tan φ · tan δ, phương vị mọc/lặn
    ecliptic.ts   hoàng đạo, Mặt Trời theo ngày, hệ thiên hà
    format.ts     định dạng kiểu Việt Nam (dấu phẩy thập phân, B/N, Đ/T), đọc α/δ
  scene/        Three.js: frames (ánh xạ khung), skyLayer, horizonLayer, trails,
                celestialSphere (khung trái), horizonDiagram (khung phải), view (cơ sở)
  ui/           Bảng điều khiển, bản đồ, thẻ thông tin, tooltip, hộp thoại, học tập
  data/         Danh mục sao, chòm sao, địa điểm, nhiệm vụ học tập; generated/ (JSON)
  i18n/vi.json  Toàn bộ chuỗi giao diện
  state.ts      Một nguồn trạng thái duy nhất + các thao tác
  animator.ts   Hoạt ảnh theo thời gian thực
```

Cả hai khung nhìn chỉ render từ một `Store` duy nhất. Mọi đối tượng bầu trời được dựng trong hệ xích đạo
gốc và đặt vào nhóm có ma trận `B(khung, φ) · Rz(−LST)` — cùng phép quay như công thức ở `astro/coords.ts`,
nên hai khung đồng bộ tuyệt đối. Vết sao là cung cố định trên vòng xích vĩ trong hệ quay (dựng một lần,
mỗi khung hình chỉ đổi một uniform), nên rất nhẹ.

## Kiểm chứng tiêu chí nghiệm thu

| # | Tiêu chí | Cách kiểm chứng |
|---|---|---|
| 1 | φ = 21,03° B: thiên cực cao 21,03°, xích đạo nghiêng 68,97° | Unit test (`astro.test.ts`) + nhãn góc trên giản đồ |
| 2 | φ = 90°: mọi sao δ > 0 cận cực; φ = 0°: không sao cận cực | Unit test |
| 3 | δ = 0° mọc đúng Đông, lặn đúng Tây (trừ hai cực) | Unit test với mọi vĩ độ −89°…89° |
| 4 | Hai khung đồng bộ tuyệt đối | Unit test `frames.test.ts`: vị trí 3D ở cả hai khung khớp (A, h) với sai số < 10⁻⁹ |
| 5 | Sai số A, h so với astronomy-engine < 0,1° | Unit test so sánh 300 trường hợp ngẫu nhiên |
| 6 | ≥ 50 FPS với ~1000 sao | Đo trên Chrome: 350 sao có vết dài + 1334 sao nền ≈ 3,3 ms/khung (cả hai khung) |
| 7 | Không còn chuỗi tiếng Anh | Unit test `i18n.test.ts`: mọi khóa có trong `vi.json`, quét từ tiếng Anh thông dụng |

## Dữ liệu và giấy phép

- Danh mục sao và đường nối chòm sao: [d3-celestial](https://github.com/ofrohn/d3-celestial) (BSD-3-Clause), dữ liệu gốc từ HYG Database.
- Đường bờ lục địa: Natural Earth (phạm vi công cộng) qua gói `world-atlas` (ISC).
- Three.js (MIT). `astronomy-engine` (MIT) chỉ dùng trong test.
