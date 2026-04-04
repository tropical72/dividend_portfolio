#!/bin/bash
# 클립보드에서 이미지를 가져와 debug_screen.png로 저장 (기존 파일 덮어쓰기)
if command -v xclip &> /dev/null; then
    xclip -selection clipboard -t image/png -o > debug_screen.png 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ [Success] Clipboard image saved to debug_screen.png"
    else
        echo "❌ [Error] No image found in clipboard (X11)."
    fi
elif command -v wl-paste &> /dev/null; then
    wl-paste > debug_screen.png 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ [Success] Clipboard image saved to debug_screen.png"
    else
        echo "❌ [Error] No image found in clipboard (Wayland)."
    fi
else
    echo "❌ [Error] Neither 'xclip' nor 'wl-paste' found. Please install one (e.g., sudo apt install xclip)."
fi
