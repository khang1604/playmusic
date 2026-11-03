# PlayMusic Studio

> **Phần mềm phát nhạc sự kiện, sân khấu, Soundboard & Audio Cue độ trễ siêu thấp cho Ubuntu Linux & Windows**  
> *(Ultra-Low Latency, Multi-Track Audio Cue & Polyphonic Soundboard Workstation for Ubuntu Linux & Windows)*

[🇻🇳 Xem phần giới thiệu tiếng Việt](#-giới-thiệu-tiếng-việt) | [English Documentation](#-english-overview--features) | [Tải về / Downloads](#-tải-về--cài-đặt--downloads-latest-release-v1011)

---

## 🇻🇳 Giới thiệu (Tiếng Việt)

**PlayMusic Studio** là phần mềm phát âm thanh, nhạc sự kiện và soundboard chuyên nghiệp mã nguồn mở, được thiết kế tối ưu dành riêng cho **kỹ thuật viên âm thanh (Soundman), đạo diễn sự kiện, hội nghị, nhà hát, thể thao và DJ** chạy mượt mà trên **Ubuntu Linux** và **Windows 10 / 11**.

Khác với các trình phát nhạc thông thường (chỉ mở được từng bài, khó chuyển cảnh và dễ bấm nhầm), PlayMusic Studio mang đến giao diện bàn Launchpad trực quan với khả năng kích hoạt tức thì, đo âm lượng chuẩn phòng thu và bảo vệ an toàn tối đa khi biểu diễn live.

### ✨ Điểm nổi bật chính:
- ⚡ **Kích hoạt tức thì (< 1ms):** Toàn bộ bài nhạc được giải nén sẵn trên RAM, bấm phím là âm thanh phát ra ngay lập tức, không có độ trễ đọc ổ đĩa.
- 🎛️ **Lưới 20 ô mặc định & Tự động mở rộng:** Khởi đầu với 20 ô bài hát gán sẵn phím tắt (`1-0`, `Q-P`). Khi kéo thả 30 hay 50 file nhạc vào, ứng dụng tự động sinh thêm ô tương ứng.
- 🔄 **2 Chế độ phát linh hoạt:**
  - **Đa âm (Polyphonic):** Bật cùng lúc nhiều bài nhạc, hiệu ứng tiếng vỗ tay, nhạc hiệu, fanfare đè lên nhau.
  - **Độc quyền (Solo Exclusive):** Bấm phát bài mới sẽ tự động mờ dần (smooth fade-out) và ngắt bài cũ, chống tạp âm đè nhau trên sân khấu.
- ⏱️ **Điểm bắt đầu nhạc (Cue In Offset):** Nhập trực tiếp số giây (ví dụ `00:03.5s`) trên từng ô để bỏ qua đoạn dạo đầu im lặng, bấm phím là vào ngay đoạn cao trào.
- 🎚️ **Bàn Master Console & Cột VU Meter chuẩn đài truyền hình:**
  - Cột đèn Stereo L/R sử dụng công nghệ vẽ Canvas 2D siêu nhẹ (0% tải khi đứng yên).
  - Thang đo dB kép đầy đủ vạch (`+3dB`, `0dB`, `-6dB`, `-12dB`, `-24dB`, `-∞`).
  - Cần gạt Master Fader tùy biến cho phép tinh chỉnh 5% bằng phím mũi tên hoặc 1% bằng tổ hợp `Shift + Mũi tên`.
- 🛡️ **An toàn tuyệt đối trên sân khấu:** Nút **Dừng khẩn cấp (Panic Stop)** màu đỏ bắt buộc phải click chuột trực tiếp — loại bỏ hoàn toàn phím Space/Esc để tránh quẹt nhầm tay làm tắt nhạc giữa chương trình.
- 🖱️ **Tua nhạc và chỉnh âm lượng bằng con lăn chuột:** Lăn chuột trên thanh tiến trình để tua tới/lùi, lăn chuột trên cần gạt để tăng giảm volume nhanh chóng.
- 💾 **Lưu và nạp kịch bản show (Preset):** Lưu toàn bộ danh sách bài hát, phím gán, màu sắc, điểm Cue thành file `.json` để mang đi diễn nhiều nơi.

---

### 📖 Hướng dẫn sử dụng nhanh:
1. **Nạp nhạc:** Kéo thả trực tiếp một hoặc nhiều file nhạc (`.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`) vào các ô.
2. **Phát / Tạm dừng:** Bấm phím tương ứng hiển thị trên ô (ví dụ: `1`, `2`, `Q`, `W`...) hoặc click chuột vào ô bài hát.
3. **Tua nhanh/chậm:** Click chuột vào thanh tiến trình hoặc đặt con trỏ chuột lên thanh rồi lăn con lăn chuột để tua.
4. **Đổi tên & Đổi màu:** Click vào tên ô hoặc biểu tượng bánh răng để đổi màu nhận diện (MC, Nhạc nền, Hiệu ứng, Khai mạc...).
5. **Đổi vị trí ô:** Nhấn giữ và kéo biểu tượng `⋮⋮` trên ô này thả sang ô khác để hoán đổi vị trí.
6. **Lưu chương trình:** Bấm nút **"Lưu Preset"** ở cột phải để lưu kịch bản show diễn.

---

## 🌟 English Overview & Features

### 🎛️ Dynamic Launchpad Grid & Decks
- **Clean 20-Deck Default (5x4 Grid)**: Starts with 20 neatly organized slots mapped to default keys (`1-0`, `Q-P`).
- **Dynamic Auto-Expansion**: Drag & drop 25, 30, or 50+ audio tracks at once — PlayMusic automatically spawns new slots with auto-assigned hotkeys and labels without limit.
- **Manual Slot Management**: Add new slots anytime via the `+ Thêm ô mới` card or delete unwanted slots via slot settings with safe ID preservation.
- **Drag & Drop Reordering**: Drag any deck card onto another to instantly swap their order on the grid.
- **Polyphonic & Exclusive Playback**:
  - *Polyphonic (Đa âm)*: Play multiple tracks, ambiences, fanfares, and SFX simultaneously.
  - *Exclusive Solo (Độc quyền)*: Triggering a new track automatically smooth-fades out and stops the previous track.
- **Numerical Cue-In Offset**: Set an exact start offset directly on the card or in settings (e.g. `00:03.5s`) to bypass silent intros and hit the climax instantly.
- **Instant Mute & Loop**: Independent mute toggle and seamless infinite looping per track.
- **8 High-Contrast Stage Colors**: Color-code tracks (MC, Background, Fanfare, Drama, SFX) for instant visual recognition in dark sound booths.

### 🎚️ Master Console & Broadcast Metering
- **Right Vertical Mixer Strip**: Ergonomically placed on the right, keeping the main launchpad clutter-free.
- **Hardware-Accelerated Stereo VU Meter**:
  - Built with low-level 2D Canvas rendering (zero React DOM overhead, zero GPU blur thrashing).
  - Dual-sided dB scale markings (`+3`, `0dB`, `-6`, `-12`, `-24`, `-∞`).
  - Studio Ballistic Decay (IEC 60268-10 standard): Instant peak attack with smooth gliding decay.
  - Deep-Sleep Mode: Zero CPU and GPU usage when audio is idle.
- **Studio Master Fader**: Custom pointer-driven vertical hardware fader with dB reference markings.
- **Smooth Fade-Out Control**: Adjustable fade duration slider from 0.2s to 4.0s.
- **Show Preset Management**: Save and load complete event setups as clean `.json` presets.
- **New Show (Reset All)**: One-click workspace refresh with confirmation modal to safely reset all slots for the next event.

### 🛡️ Stage Safety & Ergonomic Controls
- **Fail-Safe Mouse-Only Panic Stop**: Spacebar and Escape shortcuts are strictly removed from Panic Stop to prevent accidental keyboard trips on stage. Panic Stop is strictly triggered by clicking the prominent red button.
- **Mouse Wheel Controls**:
  - Hover over seek bar + mouse wheel: Seek ±2s (Shift + wheel: ±5s).
  - Hover over track volume + mouse wheel: Adjust track gain ±5%.
- **Keyboard Master Volume**:
  - `Arrow Up` / `Arrow Down`: Adjust Master Volume by 5%.
  - `Shift` + `Arrow Up` / `Arrow Down`: Precision fine tuning by 1%.
- **Universal Audio Format Support**: Instant playback for `.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`, `.aac`.

---

## 📥 Tải về & Cài đặt / Downloads (Latest Release v1.0.11)

Get the latest pre-compiled installers directly from [GitHub Releases v1.0.11](https://github.com/khang1604/playmusic/releases/tag/v1.0.11):

| Platform | Format | Download Link |
| :--- | :--- | :--- |
| **Ubuntu Linux** | `.deb` (Recommended) | [PlayMusic_1.0.11_amd64.deb](https://github.com/khang1604/playmusic/releases/download/v1.0.11/PlayMusic_1.0.11_amd64.deb) |
| **Linux Portable** | `.AppImage` (Run anywhere) | [PlayMusic_1.0.11_amd64.AppImage](https://github.com/khang1604/playmusic/releases/download/v1.0.11/PlayMusic_1.0.11_amd64.AppImage) |
| **Windows** | `.exe` Setup | [PlayMusic_1.0.11_x64-setup.exe](https://github.com/khang1604/playmusic/releases/download/v1.0.11/PlayMusic_1.0.11_x64-setup.exe) |
| **Windows** | `.msi` Package | [PlayMusic_1.0.11_x64_en-US.msi](https://github.com/khang1604/playmusic/releases/download/v1.0.11/PlayMusic_1.0.11_x64_en-US.msi) |

---

## 🚀 Installation & Quick Start on Ubuntu Linux

### Option 1: Install via APT (`.deb`)
```bash
wget https://github.com/khang1604/playmusic/releases/download/v1.0.11/PlayMusic_1.0.11_amd64.deb
sudo apt install ./PlayMusic_1.0.11_amd64.deb
```
PlayMusic Studio will appear in your Ubuntu App Launcher with full desktop shortcut integration.

### Option 2: Portable AppImage (No installation required)
Ideal for running directly from a USB flash drive on event laptops:
```bash
wget https://github.com/khang1604/playmusic/releases/download/v1.0.11/PlayMusic_1.0.11_amd64.AppImage
chmod +x PlayMusic_1.0.11_amd64.AppImage
./PlayMusic_1.0.11_amd64.AppImage
```

---

## 🛠️ Development & Building from Source

### Prerequisites
- **Node.js**: v20 or v22 LTS
- **Rust**: stable toolchain (`rustup`)
- **Ubuntu Dependencies**:
  ```bash
  sudo apt update
  sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev libasound2-dev fuse3 xdg-utils
  ```

### Run in Development Mode
```bash
git clone https://github.com/khang1604/playmusic.git
cd playmusic
npm install
npm run dev
```

### Build Production Desktop Packages
```bash
# Build for Linux (.deb & .AppImage)
bash scripts/build-linux.sh

# Build for Windows (.exe & .msi)
scripts\build-windows.bat
```

---

## 📁 Project Architecture

```
playmusic/
├── frontend/                   # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── deck/           # DeckCard (audio slot, timer, cue, waveform seek)
│   │   │   ├── controls/       # MasterConsole (hardware fader, stereo canvas VU meter)
│   │   │   └── modals/         # EditSlotModal, Reset confirmation
│   │   ├── features/audio/     # Polyphonic Web Audio Engine (low-latency, zero-alloc FFT)
│   │   ├── types/              # TypeScript types & Zod schemas
│   │   └── utils/              # IndexedDB audio storage, structured logger
├── src-tauri/                  # Rust Tauri Desktop Bridge (cross-platform native shell)
├── scripts/                    # setup-ubuntu.sh, build-linux.sh, build-windows.bat
└── docs/                       # Architecture & session progression logs
```

---

## 📄 License
MIT License. Crafted with precision for live event sound engineers and stage technicians.

