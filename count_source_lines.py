import os
import re

# 要排除的目录
exclude_dirs = {
    'node_modules', 'dist', 'build', '.git', 'venv', '.env',
    'nodejs/node_modules', 'admin/node_modules', 'mobile/node_modules'
}

# 要包含的文件扩展名
include_extensions = {
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.html', '.css', '.json'
}

def is_excluded(path):
    """检查路径是否需要排除"""
    for exclude_dir in exclude_dirs:
        if exclude_dir in path:
            return True
    return False

def count_lines_in_file(file_path):
    """统计单个文件的行数"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return sum(1 for _ in f)
    except Exception:
        return 0

def count_source_lines(root_dir):
    """统计项目源代码行数"""
    total_lines = 0
    file_count = 0
    
    for root, dirs, files in os.walk(root_dir):
        # 过滤排除的目录
        dirs[:] = [d for d in dirs if not is_excluded(os.path.join(root, d))]
        
        for file in files:
            if any(file.endswith(ext) for ext in include_extensions):
                file_path = os.path.join(root, file)
                if not is_excluded(file_path):
                    lines = count_lines_in_file(file_path)
                    total_lines += lines
                    file_count += 1
    
    return total_lines, file_count

if __name__ == '__main__':
    project_root = os.path.dirname(os.path.abspath(__file__))
    total_lines, file_count = count_source_lines(project_root)
    
    print(f"项目源代码统计结果:")
    print(f"总文件数: {file_count}")
    print(f"总行数: {total_lines}")
    print(f"平均每个文件行数: {total_lines / file_count:.2f}" if file_count > 0 else "无文件")
