# 在群晖（Synology）NAS 上部署「管卡」

本文档面向 Synology DSM 7.2+。项目自带 `Dockerfile`，**镜像在 NAS 上本地构建**（无需 Docker Hub、
无需联网拉取业务镜像，仅首次构建需联网下载 `node:20-alpine` 基础镜像）。

> 说明：本项目已放弃 Docker Hub 镜像发布方案，`docker-compose.yml` 用的是 `build: .`，
> 因此部署时必须把**完整源码**放到 NAS 上，不能只拿一个 compose 文件。

---

## 0. 先看懂这张表（部署前必读）

| 项目 | 值 | 说明 |
|------|-----|------|
| 服务名 / 容器名 | `guanka` / `credit-card-manager` | compose 中已固定 |
| 访问端口 | `3000` | 群晖自身占用 5000/5001/80/443，3000 通常空闲 |
| 数据位置 | Docker 命名卷 `guanka-data` → 容器内 `/app/data` | **不要**随意删除该卷 |
| 命名卷落盘位置 | `/volume1/@docker/volumes/guanka-data/_data/` | 群晖版本不同路径可能略有差异，用 `sudo docker volume inspect guanka-data` 查 `Mountpoint` 字段最准 |
| 建议源码目录 | `/volume1/docker/credit-card-manager` | 群晖 Docker 的标准存放位置 |
| 运行用户 | `node`（uid 1000，非 root） | **绑定目录挂载时必须给 1000 权限**，见 §5 |
| 首次启动 | 自动写入 83 张卡种库示例数据 | 无需任何人工配置 |
| 重启策略 | `unless-stopped` | NAS 重启后容器自动拉起 |

**需要准备的源码文件（一个都不能少）**：

```
credit-card-manager/
├── Dockerfile              ← 构建必需
├── docker-compose.yml      ← 构建必需
├── package.json            ← 构建必需
├── server/                 ← 后端（必需，整个目录）
├── public/                 ← 前端（必需，整个目录）
└── README.md / LICENSE     ← 可选
```

`data/` 目录**不要**放上去（里面是本地开发数据，容器会用卷覆盖它）。

---

## 1. 前置准备

### 1.1 安装 Container Manager

1. 打开 **套件中心** → 搜索 `Container Manager` → 安装（DSM 7.2 及以上）
2. DSM 7.0 / 7.1 对应的是旧版 `Docker` 套件，界面略有差异但步骤一致
3. 安装完成后，主菜单里会出现 **Container Manager**

### 1.2 创建源码目录（关键避坑点）

> ⚠️ **群晖的 Docker 不会自动创建宿主目录**。如果 compose 里引用了不存在的路径，
> 启动会直接报 `Bind mount failed` / `no such file or directory`。所以目录必须先手工建好。

用 **File Station** 操作：

1. 打开 File Station → 进入 `docker` 共享文件夹
   （若没有 `docker` 共享文件夹：控制面板 → 共享文件夹 → 新增 → 名称填 `docker`）
2. 在 `docker` 下新建文件夹 `credit-card-manager`
3. 最终路径为：`/volume1/docker/credit-card-manager`

命令行等价操作（需先开 SSH）：

```bash
sudo mkdir -p /volume1/docker/credit-card-manager
```

### 1.3 （可选）开启 SSH

控制面板 → **终端机和 SNMP** → 勾选「启动 SSH 功能」→ 端口默认 22 → 应用。

之后用电脑的终端连接：

```bash
ssh 你的群晖用户名@群晖IP
# 之后所有 docker 命令都要加 sudo
```

---

## 2. 上传源码

### 方式 A：File Station 上传（纯图形界面）

1. 在本地把项目打包成 zip（不含 `data/`、`.git/`、`node_modules/`）
2. File Station → 进入 `/volume1/docker/credit-card-manager`
3. 点「上传」→「上传 - 覆盖」，把 zip 传上去
4. 右键 zip → **解压缩到 credit-card-manager**
5. 确认目录结构：`/volume1/docker/credit-card-manager/Dockerfile`、`docker-compose.yml`、
   `server/`、`public/` 都在**这一层**（不要多套一层 `credit-card-manager/credit-card-manager/`）

> 这一步是最常见的翻车点：解压后多了一层同名目录，导致 `build: .` 找不到 `Dockerfile`。

### 方式 B：SSH 上传（推荐，快且不易出错）

```bash
# 在本地电脑执行（Windows 用 Git Bash / PowerShell 的 scp）
scp credit-card-manager-docker.zip 群晖用户名@群晖IP:/volume1/docker/credit-card-manager/

# 登录 NAS 后解压
ssh 群晖用户名@群晖IP
cd /volume1/docker/credit-card-manager
sudo unzip -o credit-card-manager-docker.zip
ls -la          # 确认 Dockerfile / docker-compose.yml 就在当前层
```

---

## 3. 方式一：GUI「项目」部署（推荐新手）

1. 打开 **Container Manager** → 左侧 **项目** → 点 **新增**
2. 填写：

   | 字段 | 填写内容 |
   |------|---------|
   | 项目名称 | `credit-card-manager` |
   | 路径 | 选择 `/volume1/docker/credit-card-manager` |
   | 来源 | 选 **创建 docker-compose.yml** |

3. 在编辑框里粘贴（内容与项目自带 `docker-compose.yml` 一致）：

   ```yaml
   services:
     guanka:
       build: .
       image: credit-card-manager:1.0.0
       container_name: credit-card-manager
       ports:
         - "3000:3000"
       volumes:
         - guanka-data:/app/data
       restart: unless-stopped

   volumes:
     guanka-data:
   ```

4. 点 **验证**（群晖会检查 YAML 语法）→ 通过后点 **下一步**
5. 勾选 **创建项目后立即启动** → 点 **完成**
6. 首屏会显示构建进度（拉取 `node:20-alpine` + 构建镜像），**约 1～3 分钟**，首次较慢属正常
7. 项目状态变为 **运行中** 即完成

> 若点「验证」后报 `Bind mount failed`：回到 §1.2，检查路径是否真实存在、是否拼错。

---

## 4. 方式二：SSH 命令行部署

```bash
# 1. 进入源码目录
cd /volume1/docker/credit-card-manager

# 2. 构建并后台启动
sudo docker compose up -d

# 3. 看构建/启动日志
sudo docker compose logs -f

# 4. 确认容器在跑
sudo docker ps --filter name=credit-card-manager
```

预期输出中 `STATUS` 应为 `Up ... (healthy)`——镜像内置了 `HEALTHCHECK`，
启动约 30 秒后会从 `Up` 变成 `Up (healthy)`。

常用命令（均需 `sudo`）：

```bash
sudo docker compose ps          # 状态
sudo docker compose restart     # 重启
sudo docker compose logs --tail=100   # 最近 100 行日志
sudo docker compose down        # 停止（数据保留在卷里）
sudo docker compose down -v     # 停止并删卷（慎用！数据全没）
sudo docker compose up -d --build    # 更新代码后重新构建
```

---

## 5. 关于「数据挂载」的两种选择

### 方案一（默认，推荐）：命名卷

compose 里 `volumes: - guanka-data:/app/data` 就是命名卷，**无需任何权限配置**，
容器内 `node` 用户对卷有完整读写权限。

- 落盘位置：`/volume1/@docker/volumes/guanka-data/_data/`
- 备份、升级都最省心，**建议保持默认**

### 方案二：绑定到可见目录（想直接用 File Station 看/改 JSON 时）

把 compose 改成：

```yaml
    volumes:
      - /volume1/docker/credit-card-manager/data:/app/data
```

> ⚠️ **必须先建目录并改权限**，否则容器启动即报 `EACCES: permission denied`：

```bash
sudo mkdir -p /volume1/docker/credit-card-manager/data
sudo chown -R 1000:1000 /volume1/docker/credit-card-manager/data
sudo chmod 755 /volume1/docker/credit-card-manager/data
```

`1000` 就是容器内 `node` 用户的 uid。群晖用 File Station 建的目录属主默认是 `admin`（uid 1026），
直接绑定会因权限不符而失败——这是群晖 + 非 root 镜像最常见的坑。

---

## 6. 访问与验证

1. 浏览器打开 **`http://群晖IP:3000`**（局域网内）
2. 首页出现 4 个统计卡、卡种库有 83 张卡 → 部署成功
3. 命令行自检：

   ```bash
   curl http://群晖IP:3000/api/health
   # 期望：{"ok":true,...}
   ```

**排查清单**

| 现象 | 原因 / 处理 |
|------|------------|
| 打不开，连接被拒 | 容器未运行：`sudo docker compose ps`；看 `logs` |
| 状态一直 `starting` 不变 healthy | 等 30 秒；仍不变则看日志有无端口占用/崩溃 |
| `EACCES: permission denied` | 用了绑定挂载但没 chown 1000，见 §5 方案二 |
| `Bind mount failed` | 宿主目录不存在，见 §1.2 |
| `Dockerfile not found` / `unable to prepare context` | 解压多套了一层目录，源码没在项目根，见 §2 方式 A 末尾提示 |
| 端口 3000 被占用 | 改 compose 的 `ports` 为 `"8080:3000"`，访问 `http://群晖IP:8080` |
| 构建时拉取基础镜像超时 | NAS 无法访问 Docker Hub；见 §9 离线方案三 |

群晖防火墙：若在 控制面板 → 安全性 → 防火墙 中启用了规则，需放行 TCP 3000（或你自定义的端口）。

---

## 7. 提醒通道配置（可选）

提醒功能由容器内常驻进程定时检查，**不需要群晖的计划任务 / crontab**。

进入网页 → 顶栏 🔔 → 配置 **WxPusher / Server酱³ / Bark** 任一即可，配置会存进卷里的
`notify.json`（明文）。若不想明文存盘，改用环境变量——在 compose 的 `guanka:` 下加：

```yaml
    environment:
      - WXPUSHER_APP_TOKEN=AT_xxx
      - WXPUSHER_UIDS=UID_xxx
      - SERVERCHAN_SENDKEY=SCTxxx
      - BARK_DEVICE_KEY=xxxxx
```

加完后 `sudo docker compose up -d` 生效（环境变量在 UI 未填时自动回退使用）。

---

## 8. 备份、恢复与升级

### 8.1 备份数据（命名卷）

```bash
# 建备份目录
sudo mkdir -p /volume1/docker/backup

# tar 打包命名卷（需 NAS 能拉到 alpine；不行用下面的直拷法）
sudo docker run --rm \
  -v guanka-data:/data \
  -v /volume1/docker/backup:/backup \
  alpine tar czf /backup/guanka-$(date +%Y%m%d).tar.gz -C /data .
```

**更简单、不依赖任何镜像的直拷法**（推荐，命名卷在宿主机上就是普通目录）：

```bash
sudo cp -a /volume1/@docker/volumes/guanka-data/_data/. /volume1/docker/backup/guanka-$(date +%Y%m%d)/
```

备份出来的就是 5 个 JSON：`cards.json`、`mycards.json`、`consumptions.json`、
`benefits.json`、`settings.json`（如配了提醒还有 `notify.json`）。

### 8.2 恢复

```bash
sudo docker compose down
sudo cp -a /volume1/docker/backup/guanka-20261013/. /volume1/@docker/volumes/guanka-data/_data/
sudo docker compose up -d
```

### 8.3 升级代码

```bash
cd /volume1/docker/credit-card-manager
# 覆盖上传新源码（保留 docker-compose.yml 的本地修改）
sudo docker compose up -d --build     # 重新构建并替换容器
sudo docker compose logs -f           # 确认正常
```

数据在命名卷里，**升级不会丢数据**。卡种库若有新增，启动时会自动合并（按 银行+名称+卡组织+等级 去重）。

---

## 9. 其他部署方式

### 方式三：离线导入镜像（NAS 拉不到 Docker Hub 时）

在任意装了 Docker 的电脑上构建并导出：

```bash
# 在源码目录（电脑上）
docker build -t credit-card-manager:1.0.0 .
docker save credit-card-manager:1.0.0 | gzip > credit-card-manager-1.0.0.tar.gz
```

把 tar.gz 传到 NAS，然后：

```bash
sudo gunzip -c credit-card-manager-1.0.0.tar.gz | sudo docker load
```

此时把 compose 的 `build: .` 一行**删掉**（保留 `image: credit-card-manager:1.0.0`），
再 `sudo docker compose up -d` 即可（不再需要源码）。

> 注意架构一致：群晖绝大多数机型是 `x86_64`，少数 ARM 机型（如部分 DS223j 等 Realtek/ARM 型号）
> 是 `arm64`/`armv7`。在 ARM 电脑上构建的镜像不能直接给 x86 NAS 用，反之亦然。
> 不确定时用 §3/§4 在 NAS 上本地构建，一定不会错。

### 方式四：ARM 机型

`node:20-alpine` 官方支持 `amd64 / arm64 / armv7`，在 NAS 上本地构建会自动选对架构，
**无需任何额外配置**，直接按 §3 或 §4 走即可。

---

## 10. 对外访问（可选，注意安全）

局域网内直接用 `http://群晖IP:3000` 即可。若要从公网访问：

1. **强烈建议**加一层登录保护。本应用**没有内置账号密码**，任何人能访问到端口就等于拿到
   全部信用卡数据。
2. 推荐做法：不直接映射端口到公网，而是走群晖 **反向代理** + **HTTPS 证书** +
   **访问控制**；或只在 SSH 隧道 / Tailscale / WireGuard 内网访问。
3. 若必须暴露，请至少在 控制面板 → 安全性 中开启自动封锁、限制来源 IP，
   并考虑在反代上加 Basic Auth。

最简安全姿势：**不开外网，仅在家里的局域网用。**

---

## 11. 一键检查清单

部署后逐条打勾：

- [ ] Container Manager 已安装
- [ ] `/volume1/docker/credit-card-manager` 目录已创建
- [ ] 源码已上传且 `Dockerfile`、`docker-compose.yml`、`server/`、`public/` 在同一层
- [ ] 未上传本地 `data/` 目录
- [ ] 项目已启动，`docker ps` 显示 `Up (healthy)`
- [ ] `http://群晖IP:3000` 能打开，卡种库有 83 张卡
- [ ] 数据落盘确认：`/volume1/@docker/volumes/guanka-data/_data/` 下有 JSON 文件
- [ ] 已做一次备份到 `/volume1/docker/backup/`
- [ ] （如用绑定挂载）已 `chown 1000:1000` 数据目录
- [ ] （如需外网）已加反向代理 + HTTPS + 访问控制
