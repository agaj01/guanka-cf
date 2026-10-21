# 在群晖（Synology）NAS 上部署「管卡」— 局域网访问版

本文档面向 Synology DSM 7.2+，目标：**在群晖上跑起来，并让家里局域网的手机/电脑都能访问**。
项目自带 `Dockerfile`，**镜像在 NAS 上本地构建**（无需 Docker Hub 业务镜像，仅首次构建需联网拉取 `node:20-alpine` 基础镜像）。

> 说明：`docker-compose.yml` 用的是 `build: .`，部署时必须把**完整源码**放到 NAS 上，
> 不能只拿一个 compose 文件。项目零 npm 依赖，构建很快。

---

## 0. 先看懂这张表（部署前必读）

| 项目 | 值 | 说明 |
|------|-----|------|
| 服务名 / 容器名 | `guanka` / `credit-card-manager` | compose 中已固定 |
| 访问端口 | `3000` | 群晖自身占用 5000/5001/80/443，3000 通常空闲 |
| 数据位置 | Docker 命名卷 `guanka-data` → 容器内 `/app/data` | **不要**随意删除该卷 |
| 命名卷落盘位置 | `/volume1/@docker/volumes/guanka-data/_data/` | 用 `sudo docker volume inspect guanka-data` 查 `Mountpoint` 最准 |
| 建议源码目录 | `/volume1/docker/credit-card-manager` | 群晖 Docker 的标准存放位置 |
| 运行用户 | `node`（uid 1000，非 root） | 绑定目录挂载时必须给 1000 权限，见 §5 |
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

### 1.2 创建源码目录（关键避坑点）

> ⚠️ **群晖的 Docker 不会自动创建宿主目录**。如果 compose 引用了不存在的路径，
> 启动会直接报 `Bind mount failed` / `no such file or directory`。目录必须先手工建好。

用 **File Station** 操作：

1. 打开 File Station → 进入 `docker` 共享文件夹
   （若没有：控制面板 → 共享文件夹 → 新增 → 名称填 `docker`）
2. 在 `docker` 下新建文件夹 `credit-card-manager`
3. 最终路径为：`/volume1/docker/credit-card-manager`

命令行等价操作（需先开 SSH）：

```bash
sudo mkdir -p /volume1/docker/credit-card-manager
```

### 1.3 开启 SSH（推荐，后面多条命令要用）

控制面板 → **终端机和 SNMP** → 勾选「启动 SSH 功能」→ 端口默认 22 → 应用。

之后用电脑的终端连接：

```bash
ssh 你的群晖用户名@群晖IP
# 之后所有 docker 命令都要加 sudo
```

---

## 2. 上传源码

### 方式 A：File Station 上传（纯图形界面）

1. 在本地把项目打包成 zip（**不含** `data/`、`.git/`、`node_modules/`）
2. File Station → 进入 `/volume1/docker/credit-card-manager`
3. 点「上传」→「上传 - 覆盖」，把 zip 传上去
4. 右键 zip → **解压缩到当前文件夹**
5. 确认目录结构：`Dockerfile`、`docker-compose.yml`、`server/`、`public/` 都在**这一层**
   （不要多套一层 `credit-card-manager/credit-card-manager/`）

> 这一步是最常见的翻车点：解压后多了一层同名目录，导致 `build: .` 找不到 `Dockerfile`。

### 方式 B：git 拉取（推荐，一步到位且版本最新）

```bash
ssh 群晖用户名@群晖IP
cd /volume1/docker
sudo git clone https://github.com/folkson/credit-card-manager-docker.git credit-card-manager
ls /volume1/docker/credit-card-manager   # 确认 Dockerfile、docker-compose.yml 就在这一层
```

> 仓库若为 private，先在 NAS 上配好凭据或改用方式 A。

---

## 3. 方式一：GUI「项目」部署（推荐新手）

### 3.1 生成访问令牌（局域网访问必做）

局域网访问必须设置 `AUTH_TOKEN`，否则应用只接受群晖本机访问（其它设备 403）。
SSH 到 NAS 生成一个随机口令：

```bash
head -c 32 /dev/urandom | base64
# 输出形如：Xk9mP2qR7vLw3sY8nB4cD1eF5gH6iJ0k（复制保存好，这就是你的访问令牌）
```

### 3.2 创建项目

1. 打开 **Container Manager** → 左侧 **项目** → 点 **新增**
2. 填写：

   | 字段 | 填写内容 |
   |------|---------|
   | 项目名称 | `credit-card-manager` |
   | 路径 | 选择 `/volume1/docker/credit-card-manager` |
   | 来源 | 选 **创建 docker-compose.yml** |

3. 在编辑框里粘贴（**局域网访问版**）：

   ```yaml
   services:
     guanka:
       build: .
       image: credit-card-manager:1.2.4
       container_name: credit-card-manager
       ports:
         - "3000:3000"          # 局域网访问：绑所有网卡；想仅本机用改回 "127.0.0.1:3000:3000"
       environment:
         AUTH_TOKEN: ${AUTH_TOKEN:-}   # 必设，见 §3.1；留空则局域网一律 403
         TRUST_HTTPS: ${TRUST_HTTPS:-0}
       volumes:
         - guanka-data:/app/data
       restart: unless-stopped

   volumes:
     guanka-data:
   ```

4. 点 **下一步** → 在 **环境** 标签页（或「环境变量」设置处）添加变量：

   | 变量名 | 值 |
   |--------|-----|
   | `AUTH_TOKEN` | §3.1 生成的口令 |

   > 也可以改用 `.env` 文件：在 `/volume1/docker/credit-card-manager/` 下新建 `.env`，
   > 内容一行：`AUTH_TOKEN=刚才生成的口令`。compose 会自动读取。两种方式二选一。

5. 勾选 **创建项目后立即启动** → 点 **完成**
6. 首屏显示构建进度（拉取 `node:20-alpine` + 构建镜像），**约 1～3 分钟**属正常
7. 项目状态变为 **运行中** 即完成

> 若报 `Bind mount failed`：回到 §1.2 检查路径是否真实存在、是否拼错。

### 3.3 用命令行方式部署（等价，二选一）

```bash
cd /volume1/docker/credit-card-manager

# 1) 写 .env（把输出粘贴进去）
echo "AUTH_TOKEN=$(head -c 32 /dev/urandom | base64)" | sudo tee .env > /dev/null

# 2) 构建并后台启动
sudo docker compose up -d

# 3) 看日志（Ctrl+C 退出，不影响服务）
sudo docker compose logs -f

# 4) 确认容器在跑
sudo docker ps --filter name=credit-card-manager
```

预期 `STATUS` 为 `Up ... (healthy)`——镜像内置了 `HEALTHCHECK`，启动约 30 秒后从 `Up` 变为 `Up (healthy)`。

常用命令（均需 `sudo`）：

```bash
sudo docker compose ps                # 状态
sudo docker compose restart           # 重启
sudo docker compose logs --tail=100   # 最近 100 行日志
sudo docker compose down              # 停止（数据保留在卷里）
sudo docker compose down -v           # 停止并删卷（慎用！数据全没）
sudo docker compose up -d --build     # 更新代码后重新构建
```

---

## 4. 局域网访问验证

1. 在**局域网内另一台设备**（手机/电脑，别用 NAS 本机）打开：
   **`http://群晖IP:3000`**（群晖 IP 可在 控制面板 → 信息中心 查看，如 `192.168.1.10`）
2. 首次访问弹出令牌输入框 → 输入 `AUTH_TOKEN` → 进入首页
3. 首页出现 4 个统计卡、卡种库有 83 张卡 → 部署成功，局域网访问打通
4. 命令行自检（任意局域网设备）：

   ```bash
   curl http://群晖IP:3000/api/health
   # 期望：{"ok":true,"version":"1.2.4",...}
   ```

**排查清单（局域网打不开时按序检查）**

| 现象 | 原因 / 处理 |
|------|------------|
| 手机访问 403 | 没设 `AUTH_TOKEN` 或没生效：确认 §3.2 第 4 步变量已填，然后 `sudo docker compose up -d` 重建容器 |
| 令牌输错想重来 | 清浏览器 Cookie 或换无痕窗口重进 |
| 打不开，连接被拒 | 容器未运行：`sudo docker compose ps`；看 `logs` |
| 状态一直 `starting` | 等 30 秒；仍不变则看日志有无端口占用/崩溃 |
| `EACCES: permission denied` | 用了绑定挂载但没 chown 1000，见 §5 方案二 |
| `Bind mount failed` | 宿主目录不存在，见 §1.2 |
| `Dockerfile not found` | 解压多套了一层目录，见 §2 方式 A 末尾提示 |
| 端口 3000 被占用 | 改 compose 的 `ports` 为 `"8080:3000"`，访问 `http://群晖IP:8080` |
| 其它设备仍不通 | 群晖防火墙：控制面板 → 安全性 → 防火墙，放行 TCP 3000 |
| Wi-Fi 访客网络不通 | 手机连到主网络（访客网络常与主网隔离） |

---

## 5. 关于「数据挂载」的两种选择

### 方案一（默认，推荐）：命名卷

compose 里 `volumes: - guanka-data:/app/data` 就是命名卷，**无需任何权限配置**，
容器内 `node` 用户对卷有完整读写权限。备份、升级都最省心，**建议保持默认**。

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

## 6. 批量导入卡种：CSV 模板与步骤

系统支持两种批量导入：

| 功能 | 入口 | 格式 | 用途 |
|------|------|------|------|
| **卡种库批量导入** | 卡种库页「导入」按钮 | CSV（12 列） | 批量填写卡产品信息（银行/年费/权益等） |
| **持卡数据备份/恢复** | 我的持卡页「备份」「恢复」按钮 | JSON（系统导出） | 整库备份、跨实例迁移 |

你要批量填卡信息，用的是 **CSV 卡种导入**。模板见仓库 `template/cards-template.csv`，
也可直接复制下面内容（UTF-8 编码，**表头必须一字不差**）：

```csv
银行,卡片名称,卡等级,卡组织,年费,免年费类型,刷免条件,免年费政策,起批额度,主要权益,申请条件,备注
招商银行,经典白金信用卡,白金卡,银联+Mastercard,1000,消费刷免,60000,核卡当年刷满6万免次年,,,生日10倍积分,,
浦发银行,AE白金信用卡,白金卡,美国运通,3600,消费刷免,600000,年刷满60万免次年年费,,,5万起批额度,送龙腾,Example
中信银行,i黑金信用卡,金卡,银联,480,笔数刷免,6,年刷满6笔免次年年费,,,医院挂号绿色通道,,
```

### 列说明

| 列名 | 必填 | 说明 / 取值 |
|------|------|------------|
| 银行 | ✅ | 如 `招商银行`；为空该行报错跳过 |
| 卡片名称 | ✅ | 如 `经典白金信用卡`；为空报错跳过 |
| 卡等级 |  | 如 `普卡`/`金卡`/`白金卡`/`黑金卡`/`无限卡`，自由文本 |
| 卡组织 |  | 如 `银联`/`VISA`/`Mastercard`/`美国运通`/`JCB`/`银联+Mastercard` |
| 年费 |  | 数字，如 `1000`；空或非法按 `0` 处理 |
| 免年费类型 |  | 只认这 6 个值：`消费刷免` / `笔数刷免` / `积分抵扣` / `资产存免` / `刚性` / `免年费`；其它值归为 `免年费` |
| 刷免条件 |  | 数字或文本，如 `60000`（刷满6万）、`6`（6笔） |
| 免年费政策 |  | 自由文本，如 `核卡当年刷满6万免次年` |
| 起批额度 |  | 数字，如 `50000` |
| 主要权益 |  | 多个权益用 `|` 分隔，如 `机场贵宾厅|代驾2次|延误险` |
| 申请条件 |  | 自由文本 |
| 备注 |  | 自由文本 |

**去重规则**：系统按「银行 + 卡片名称 + 卡组织 + 卡等级」四元组判重，
与库中已有卡种或文件内其它行重复的自动跳过（结果页会列出跳过清单），不会产生重复数据。

### 导入步骤

1. 用 Excel / WPS / 腾讯文档按上表填好卡信息
2. **另存为 CSV（UTF-8）**——Excel 是「CSV UTF-8（逗号分隔）」；普通 CSV 中文可能变乱码
3. 打开 `http://群晖IP:3000` → **卡种库**页 → 点 **导入** → 选择 CSV 文件（或直接粘贴 CSV 文本）→ 确认
4. 查看结果提示：`新增 N 张 / 跳过 M 张 / 错误 K 条`；点开可看每行的跳过与错误原因
5. 想清空重来：先在卡种库页删除不要的卡种（导入是追加式，不会覆盖已有卡种）

> 导入后的卡种只是「卡产品库」。要在首页管理账单日/还款日，还需到
> **我的持卡**页 → 添加持卡 → 选择对应卡种。持卡的完整备份/恢复用「备份/恢复」按钮（JSON）。

---

## 7. 提醒通道配置（可选）

提醒功能由容器内常驻进程定时检查，**不需要群晖的计划任务 / crontab**。

进入网页 → 顶栏 🔔 → 配置 **WxPusher / Server酱³ / Bark** 任一即可，配置会存进卷里的
`notify.json`。若不想明文存盘，改用环境变量——在 compose 的 `guanka:` 下加：

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
sudo mkdir -p /volume1/docker/backup

# 直拷法（推荐，命名卷在宿主机上就是普通目录，不依赖任何镜像）
sudo cp -a /volume1/@docker/volumes/guanka-data/_data/. /volume1/docker/backup/guanka-$(date +%Y%m%d)/
```

也可以在网页上直接备份：**我的持卡**页 → **备份** → 下载
`guanka-backup-日期.json`（含持卡、消费、权益、账单、账单组，不含提醒配置）。

### 8.2 恢复

两种方式：

```bash
# 方式一：文件级恢复（整卷回滚）
sudo docker compose down
sudo cp -a /volume1/docker/backup/guanka-20261014/. /volume1/@docker/volumes/guanka-data/_data/
sudo docker compose up -d
```

网页恢复：**我的持卡**页 → **恢复** → 选择备份 JSON → 模式选 `merge`（默认，按 id 去重追加）
或 `replace`（清空后全量覆盖，慎用）。

### 8.3 升级代码

```bash
cd /volume1/docker/credit-card-manager
sudo git pull                        # 方式 B 安装的用 git；zip 安装的重新上传覆盖
sudo docker compose up -d --build    # 重新构建并替换容器
sudo docker compose logs -f          # 确认正常
```

数据在命名卷里，**升级不会丢数据**。卡种库若有新增，启动时自动合并（按四元组去重）。

---

## 9. 其他部署方式

### 方式三：离线导入镜像（NAS 拉不到 Docker Hub 时）

在任意装了 Docker 的电脑上构建并导出：

```bash
docker build -t credit-card-manager:1.2.4 .
docker save credit-card-manager:1.2.4 | gzip > credit-card-manager-1.2.4.tar.gz
```

把 tar.gz 传到 NAS，然后：

```bash
sudo gunzip -c credit-card-manager-1.2.4.tar.gz | sudo docker load
```

此时把 compose 的 `build: .` 一行**删掉**（保留 `image: credit-card-manager:1.2.4`），
再 `sudo docker compose up -d` 即可（不再需要源码）。

> 注意架构一致：群晖绝大多数机型是 `x86_64`，少数 ARM 机型是 `arm64`/`armv7`。
> 不确定时用 §3 在 NAS 上本地构建，一定不会错。

---

## 10. 安全建议

最简安全姿势：**仅局域网使用 + 设置 `AUTH_TOKEN`**（本文档默认配置）。

进一步加固（可选）：

1. 群晖 控制面板 → 安全性 → 开启**自动封锁**（登录失败多次封 IP）
2. 若要走反向代理 + HTTPS 对外，设置 `TRUST_HTTPS=1`（会话 Cookie 加 `Secure`）
3. 不建议把 3000 端口直接映射到公网；外网访问优先用 Tailscale / WireGuard / SSH 隧道
4. 定期用 §8.1 做数据备份

---

## 11. 一键检查清单

- [ ] Container Manager 已安装
- [ ] `/volume1/docker/credit-card-manager` 目录已创建，源码已就位（Dockerfile/compose/server/public 同层）
- [ ] 已生成并配置 `AUTH_TOKEN`（§3.1 / §3.2 第 4 步）
- [ ] compose 的 `ports` 为 `"3000:3000"`（局域网访问版）
- [ ] 未上传本地 `data/` 目录
- [ ] 项目已启动，`docker ps` 显示 `Up (healthy)`
- [ ] **局域网另一台设备**打开 `http://群晖IP:3000`，输入令牌能进首页
- [ ] 卡种库有 83 张卡
- [ ] CSV 卡种导入测试通过（先用模板里的 4 行示例试一遍）
- [ ] 数据落盘确认：`/volume1/@docker/volumes/guanka-data/_data/` 下有 JSON 文件
- [ ] 已做一次备份（网页备份或直拷法）
- [ ] （如用绑定挂载）已 `chown 1000:1000` 数据目录
