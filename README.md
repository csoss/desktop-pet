# Timi Desktop Pet

Timi is a custom animated pet for the Codex desktop app. It is based on a round-faced cream-and-silver tabby cat with amber eyes and includes the full v2 animation contract: nine standard animation rows and sixteen look directions.

![Timi animation preview](assets/timi-preview.png)

## Install

### Quick install (macOS / Linux)

```bash
git clone https://github.com/csoss/desktop-pet.git
cd desktop-pet
./install.sh
```

The installer copies the pet to `${CODEX_HOME:-$HOME/.codex}/pets/timi`.

### Manual install

```bash
PET_DIR="${CODEX_HOME:-$HOME/.codex}/pets/timi"
mkdir -p "$PET_DIR"
cp pets/timi/pet.json "$PET_DIR/pet.json"
cp pets/timi/spritesheet.webp "$PET_DIR/spritesheet.webp"
```

After installation, reopen the pet picker in Codex. If Timi does not appear immediately, restart the Codex desktop app.

## Uninstall

```bash
rm -rf "${CODEX_HOME:-$HOME/.codex}/pets/timi"
```

## Package layout

```text
pets/timi/
├── pet.json
└── spritesheet.webp
```

The spritesheet uses the Codex v2 pet format:

- `spriteVersionNumber: 2`
- 8 columns × 11 rows
- 192 × 208 pixels per cell
- 1536 × 2288 pixels overall
- rows 0–8: idle, directional running, waving, jumping, failed, waiting, active work, and review
- rows 9–10: sixteen clockwise look directions

## 中文说明

Timi 是一个适用于 Codex 桌面应用的自定义动画宠物，包含 9 组标准动作和 16 个环视方向。

安装方式：克隆仓库后执行 `./install.sh`。脚本会将宠物复制到 `${CODEX_HOME:-$HOME/.codex}/pets/timi`。安装完成后重新打开 Codex 的宠物选择器；如果没有立即出现，请重启 Codex 桌面应用。

手动安装时，只需将 `pets/timi/pet.json` 和 `pets/timi/spritesheet.webp` 一起复制到上述目录。两个文件必须保持在同一个文件夹中。

## License

The manifest, installer, preview, and Timi spritesheet are distributed under the [MIT License](LICENSE).
