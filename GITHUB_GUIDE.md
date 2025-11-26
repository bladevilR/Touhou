# GitHub 操作指南

本文档说明如何在任何终端/CLI中更新和管理这个项目。

## 📋 目录

- [首次设置](#首次设置)
- [日常更新流程](#日常更新流程)
- [常见问题](#常见问题)
- [自动部署](#自动部署)

---

## 🚀 首次设置

### 1. 克隆项目到本地

```bash
# 使用 SSH (推荐)
git clone git@github.com:bladevilR/Touhou.git

# 或使用 HTTPS (如果SSH不可用)
git clone https://github.com/bladevilR/Touhou.git
```

### 2. 进入项目目录

```bash
cd Touhou
```

### 3. 安装依赖 (仅限 touhou-phantom 子项目)

```bash
cd touhou-phantom
npm install
```

---

## 🔄 日常更新流程

### 方法一：快速更新（推荐）

适用于简单的代码修改和推送：

```bash
# 1. 拉取最新代码
git pull

# 2. 进行你的代码修改
# ... 编辑文件 ...

# 3. 一键提交并推送所有更改
git add .
git commit -m "你的提交信息描述"
git push
```

### 方法二：详细流程

适用于需要精确控制的场景：

```bash
# 1. 查看当前状态
git status

# 2. 查看具体改动
git diff

# 3. 添加特定文件
git add 文件名
# 或添加所有更改
git add .

# 4. 提交更改
git commit -m "提交信息"

# 5. 推送到远程仓库
git push
```

---

## 📝 提交信息规范

建议使用清晰的提交信息，例如：

```bash
# 功能更新
git commit -m "Add new enemy type in game"

# Bug 修复
git commit -m "Fix player collision detection bug"

# 优化改进
git commit -m "Optimize texture loading performance"

# 文档更新
git commit -m "Update README with new features"
```

---

## 🛠️ 项目构建与测试

### 本地���行开发服务器

```bash
cd touhou-phantom
npm run dev
```

访问: http://localhost:3000

### 本地构建生产版本

```bash
cd touhou-phantom
npm run build
```

构建产物位于 `touhou-phantom/dist/` 目录。

### 本地预览生产版本

```bash
cd touhou-phantom
npm run preview
```

---

## 🌐 自动部署

### GitHub Pages 自动部署

本项目已配置 GitHub Actions 自动部署：

- **触发条件**: 每次推送到 `main` 分支
- **部署目标**: GitHub Pages
- **网站地址**: https://bladevilr.github.io/Touhou/

### 查看部署状态

访问: https://github.com/bladevilR/Touhou/actions

- ✅ 绿色勾 = 部署成功
- ❌ 红色叉 = 部署失败（查看日志）
- 🟡 黄色圆圈 = 正在部署中

### 部署时间

通常需要 1-3 分钟完成部署。

---

## ❓ 常见问题

### 问题 1: 推送失败 - 连接超时

**错误信息**: `Failed to connect to github.com port 443`

**解决方案**: 切换到 SSH 协议

```bash
# 检查当前远程地址
git remote -v

# 如果显示 https://，切换到 SSH
git remote set-url origin git@github.com:bladevilR/Touhou.git

# 再次推送
git push
```

### 问题 2: SSH 密钥未配置

**错误信息**: `Permission denied (publickey)`

**解决方案**:

1. 生成 SSH 密钥（如果没有）：
```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

2. 显示公钥：
```bash
cat ~/.ssh/id_rsa.pub
```

3. 复制输出内容，添加到 GitHub:
   - 访问 https://github.com/settings/keys
   - 点击 "New SSH key"
   - 粘贴公钥内容

### 问题 3: 本地代码落后于远程

**错误信息**: `Updates were rejected because the remote contains work`

**解决方案**:

```bash
# 先拉取远程更改
git pull

# 如果有冲突，解决冲突后
git add .
git commit -m "Merge remote changes"

# 再推送
git push
```

### 问题 4: 合并冲突

**当出现冲突时**:

```bash
# 1. 查看冲突文件
git status

# 2. 手动编辑冲突文件，解决冲突标记：
#    <<<<<<< HEAD
#    你的更改
#    =======
#    远程的更改
#    >>>>>>> branch-name

# 3. 标记冲突已解决
git add 冲突文件名

# 4. 完成合并
git commit -m "Resolve merge conflict"

# 5. 推送
git push
```

### 问题 5: 撤销最近的提交

```bash
# 撤销最后一次提交，但保留更改
git reset --soft HEAD~1

# 撤销最后一次提交，且丢弃更改（危险！）
git reset --hard HEAD~1
```

---

## 🔍 实用命令速查

### 查看信息

```bash
git status              # 查看当前状态
git log                 # 查看提交历史
git log --oneline       # 简洁的提交历史
git diff                # 查看未暂存的改动
git diff --staged       # 查看已暂存的改动
git remote -v           # 查看远程仓库地址
git branch              # 查看分支列表
```

### 分支操作

```bash
git branch 分支名        # 创建新分支
git checkout 分支名      # 切换分支
git checkout -b 分支名   # 创建并切换到新分支
git merge 分支名         # 合并分支到当前分支
git branch -d 分支名     # 删除本地分支
```

### 撤销操作

```bash
git restore 文件名       # 撤销工作区的修改
git restore --staged 文件名  # 取消暂存
git clean -fd           # 删除未跟踪的文件和目录
```

---

## 📦 项目结构

```
Touhou/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 部署配置
├── public/                     # 根目录资源文件
├── touhou-phantom/             # 主项目目录
│   ├── components/             # React 组件
│   ├── public/                 # 游戏资源（图片等）
│   ├── App.tsx                 # 主应用组件
│   ├── constants.ts            # 游戏常量配置
│   ├── types.ts                # TypeScript 类型定义
│   ├── index.html              # HTML 入口
│   ├── index.tsx               # JS 入口
│   ├── package.json            # 项目依赖
│   ├── vite.config.ts          # Vite 配置
│   └── tsconfig.json           # TypeScript 配置
├── GITHUB_GUIDE.md             # 本文档
└── README.md                   # 项目说明
```

---

## 🎯 快速参考

### 完整工作流示例

```bash
# 1. 获取最新代码
git pull

# 2. 修改代码
# ... 进行你的修改 ...

# 3. 查看改动
git status
git diff

# 4. 添加改动
git add .

# 5. 提交
git commit -m "描述你的更改"

# 6. 推送
git push

# 7. 等待自动部署完成（1-3分钟）
# 8. 访问 https://bladevilr.github.io/Touhou/ 查看效果
```

---

## 📞 获取帮助

- **GitHub Issues**: https://github.com/bladevilR/Touhou/issues
- **Git 官方文档**: https://git-scm.com/doc
- **GitHub 文档**: https://docs.github.com

---

## 📄 许可证

请根据项目实际情况添加许可证信息。

---

**最后更新**: 2025-11-26
