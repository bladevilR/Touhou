#!/usr/bin/env python3
"""
自动裁剪雪碧图中每帧的透明边缘
"""
from PIL import Image
import sys

def get_bbox(image):
    """获取图像中非透明像素的边界框"""
    # 获取 alpha 通道
    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    bbox = image.getbbox()
    return bbox

def crop_spritesheet(input_path, output_path, frame_count, direction='horizontal'):
    """
    裁剪雪碧图中每帧的透明边缘

    Args:
        input_path: 输入文件路径
        output_path: 输出文件路径
        frame_count: 帧数
        direction: 'horizontal' 或 'vertical'
    """
    print(f"加载图像: {input_path}")
    img = Image.open(input_path)

    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    width, height = img.size
    print(f"原始尺寸: {width} x {height}")

    if direction == 'horizontal':
        frame_width = width // frame_count
        frame_height = height
        print(f"每帧尺寸: {frame_width} x {frame_height}")

        # 裁剪每一帧
        cropped_frames = []
        max_crop_width = 0

        for i in range(frame_count):
            # 提取当前帧
            left = i * frame_width
            frame = img.crop((left, 0, left + frame_width, frame_height))

            # 获取非透明区域边界
            bbox = frame.getbbox()

            if bbox:
                # 裁剪透明边缘
                cropped = frame.crop(bbox)
                cropped_frames.append(cropped)
                max_crop_width = max(max_crop_width, cropped.width)
                print(f"  帧 {i}: 原始 {frame_width}x{frame_height} -> 裁剪后 {cropped.width}x{cropped.height}")
            else:
                # 如果整帧都是透明的,保留原帧
                cropped_frames.append(frame)
                max_crop_width = max(max_crop_width, frame_width)
                print(f"  帧 {i}: 完全透明,保持原样")

        # 创建新的雪碧图
        new_width = max_crop_width * frame_count
        new_height = max([f.height for f in cropped_frames])
        print(f"\n新的雪碧图尺寸: {new_width} x {new_height}")

        if new_width > 16384:
            print(f"警告: 新宽度 {new_width} 仍然超过 WebGL 限制 16384!")
            print("建议改用竖向排列")
            return False

        new_img = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))

        # 将裁剪后的帧粘贴到新图像上
        for i, frame in enumerate(cropped_frames):
            x = i * max_crop_width
            # 居中对齐
            y = (new_height - frame.height) // 2
            new_img.paste(frame, (x, y))

        new_img.save(output_path)
        print(f"\n保存到: {output_path}")
        print(f"压缩率: {(1 - new_width / width) * 100:.1f}%")
        return True

    else:  # vertical
        frame_width = width
        frame_height = height // frame_count
        print(f"每帧尺寸: {frame_width} x {frame_height}")

        # 裁剪每一帧
        cropped_frames = []
        max_crop_height = 0

        for i in range(frame_count):
            # 提取当前帧
            top = i * frame_height
            frame = img.crop((0, top, frame_width, top + frame_height))

            # 获取非透明区域边界
            bbox = frame.getbbox()

            if bbox:
                # 裁剪透明边缘
                cropped = frame.crop(bbox)
                cropped_frames.append(cropped)
                max_crop_height = max(max_crop_height, cropped.height)
                print(f"  帧 {i}: 原始 {frame_width}x{frame_height} -> 裁剪后 {cropped.width}x{cropped.height}")
            else:
                # 如果整帧都是透明的,保留原帧
                cropped_frames.append(frame)
                max_crop_height = max(max_crop_height, frame_height)
                print(f"  帧 {i}: 完全透明,保持原样")

        # 创建新的雪碧图
        new_width = max([f.width for f in cropped_frames])
        new_height = max_crop_height * frame_count
        print(f"\n新的雪碧图尺寸: {new_width} x {new_height}")

        new_img = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))

        # 将裁剪后的帧粘贴到新图像上
        for i, frame in enumerate(cropped_frames):
            # 居中对齐
            x = (new_width - frame.width) // 2
            y = i * max_crop_height
            new_img.paste(frame, (x, y))

        new_img.save(output_path)
        print(f"\n保存到: {output_path}")
        return True

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python crop_spritesheet.py <input_file> [frame_count] [direction]")
        print("示例: python crop_spritesheet.py public/down.png 17 horizontal")
        sys.exit(1)

    input_file = sys.argv[1]
    frame_count = int(sys.argv[2]) if len(sys.argv) > 2 else 17
    direction = sys.argv[3] if len(sys.argv) > 3 else 'horizontal'

    output_file = input_file.replace('.png', '_cropped.png')

    success = crop_spritesheet(input_file, output_file, frame_count, direction)

    if success:
        print("\n✓ 裁剪完成!")
        print(f"请将 {output_file} 重命名为 {input_file} 来替换原文件")
    else:
        print("\n✗ 裁剪失败")
