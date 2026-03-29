"use client"

import { useRouter } from "next/navigation"
import { DndContext } from "@dnd-kit/core"
import RoleCard from "@/components/RoleCard"
import PlayerSlot from "@/components/PlayerSlot"
import styles from "@/app/page.module.css"
import { useOneNightState, buildRecommended } from "@/hooks/useOneNightState"

const RECOMMENDED = [
  { players: 3, roles: "人狼×2、村人×1、占い師×1、怪盗×1" },
  { players: 4, roles: "人狼×2、村人×2、占い師×1、怪盗×1" },
  { players: 5, roles: "人狼×2、村人×3、占い師×1、怪盗×1" },
  { players: 6, roles: "人狼×2、村人×4、占い師×1、怪盗×1" },
]

// 共通の背景スタイル
function bgStyle(theme: string, img: string) {
  return {
    backgroundImage: `url(/image/${theme}/${img})`,
    backgroundSize: theme === "mama" ? "contain" : "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundBlendMode: "darken",
    backgroundColor: "rgba(0,0,0,0.45)",
    color: "white",
    height: "100vh",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    position: "relative" as const,
  }
}

export default function OneNightWolfPage() {
  const router = useRouter()
  const s = useOneNightState()

  // ===================== セットアップ =====================
  if (s.phase === "setup") {
    return (
      <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* 1段目 */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <button
            onClick={() => router.push("/")}
            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontSize: 14 }}
          >
            ← 戻る
          </button>
          <button
            onClick={() => s.setShowRecommended(true)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
          >
            おすすめ役職配置
          </button>
        </div>

        {/* 2段目 */}
        <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 3 }}>
          <button
            onClick={() => s.setTheme("mama")}
            className={`${styles.illustrationButton} ${s.theme === "mama" ? styles.illustrationButtonActive : ""}`}
          >
            イラスト1
          </button>
          <button
            onClick={() => s.setTheme("ai")}
            className={`${styles.illustrationButton} ${s.theme === "ai" ? styles.illustrationButtonActive : ""}`}
          >
            イラスト2
          </button>
        </div>

        <img
          src={`/image/${s.theme}/title_ichi.png`}
          style={{ width: "90%", maxWidth: 400, maxHeight: 200, marginBottom: 3 }}
        />

        <div style={{ marginBottom: 3 }}>
          人数
          <select
            style={{ padding: "6px 10px", borderRadius: 8, border: "2px solid #888", background: "#fff", fontSize: 16, cursor: "pointer" }}
            value={s.playerCount}
            onChange={e => s.setPlayerCount(Number(e.target.value))}
          >
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
            <option value={6}>6</option>
          </select>
        </div>

        <DndContext sensors={s.sensors} onDragEnd={s.handleDragEnd}>
          <h2 className={styles.sectionTitle}>配役選択</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
            {Array.from({ length: s.slotCount }, (_, i) => (
              <PlayerSlot key={i} id={i + 1} role={s.setupSlots[i]?.role ?? null} theme={s.theme} />
            ))}
          </div>
          <h2 className={styles.sectionTitle}>役職</h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}>
            {s.roles.map(r => <RoleCard key={r.id} role={r} />)}
          </div>
        </DndContext>

        <button
          onClick={s.startGame}
          style={{ marginTop: 30, padding: "14px 40px", fontSize: 22, background: "#5b86e5", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer" }}
        >
          ゲーム開始
        </button>

        {/* おすすめモーダル */}
        {s.showRecommended && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
            <div style={{ background: "#fff", padding: 28, borderRadius: 16, width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", color: "#222" }}>
              <div style={{ fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 16 }}>◉ オススメな役職配置数</div>
              {RECOMMENDED.map(({ players, roles }) => (
                <div key={players} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: "bold", marginBottom: 2 }}>{players}人で遊ぶ場合</div>
                  <div style={{ fontSize: 14, color: "#444", paddingLeft: 8 }}>{roles}</div>
                </div>
              ))}
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button
                  onClick={() => s.setShowRecommended(false)}
                  style={{ padding: "10px 36px", fontSize: 16, borderRadius: 10, border: "none", background: "#5b86e5", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===================== 夜フェーズ =====================
  if (s.phase === "night") {
    const player = s.players[s.currentPlayer - 1]
    const roleId = s.currentNightRoleId
    const otherPlayers = s.players.filter((_, i) => i !== s.currentPlayer - 1)
    const wolfAllies = s.players.filter((p, i) => i !== s.currentPlayer - 1 && p?.role.id === "werewolf")

    return (
      <div className={styles.screenBase} style={{ backgroundImage: `url(/image/${s.theme}/bg_night.png)`, backgroundSize: s.theme === "mama" ? "contain" : "cover" }}>

        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, letterSpacing: 2, textShadow: "0 3px 12px rgba(0,0,0,0.6)" }}>夜時間</h1>
        </div>

        {!s.nightActionReady ? (
          /* 行動前：役職を開く */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <p style={{ fontSize: 20 }}>{s.currentPlayer}番のプレイヤーの番です</p>
            <p style={{ fontSize: 15, opacity: 0.8 }}>他のプレイヤーは目を瞑ってください</p>
            <button onClick={s.beginNightAction} className={styles.orangeButton}>画面タップ</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", padding: "0 20px" }}>

            <img src={player?.role.img} width={80} alt={player?.role.name} />
            <p style={{ fontSize: 22, fontWeight: "bold" }}>{player?.role.name}</p>

            {/* 村人 */}
            {roleId === "villager" && (
              <p style={{ fontSize: 16, opacity: 0.85 }}>
                {s.showNextButton ? "行動完了です" : "次のプレイヤーへ進むボタンが\n表示されるまでお待ちください..."}
              </p>
            )}

            {/* 人狼 */}
            {roleId === "werewolf" && (
              <>
                <button
                  onClick={() => s.setWolfModalOpen(true)}
                  style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(220,50,50,0.8)", color: "#fff", fontSize: 16, cursor: "pointer" }}
                >
                  👥 仲間を確認する
                </button>
                {!s.showNextButton && (
                  <p style={{ fontSize: 14, opacity: 0.8 }}>次のプレイヤーへ進むボタンが<br />表示されるまでお待ちください...</p>
                )}
              </>
            )}

            {/* 怪盗：相手選択 */}
            {roleId === "robber" && s.robberTarget === null && (
              <>
                <p style={{ fontSize: 16 }}>役職を交換したいプレイヤーを選んでください</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 8 }}>
                  {otherPlayers.map(p => p && (
                    <button
                      key={p.id}
                      onClick={() => s.handleRobberSelect(p.id)}
                      style={{ padding: "12px 20px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.75)", color: "#333", fontSize: 18, fontWeight: "bold", cursor: "pointer" }}
                    >
                      {p.id}番
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 怪盗：結果 */}
            {roleId === "robber" && s.robberNewRole !== null && !s.showNextButton && (
              <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 14, padding: "20px 28px", textAlign: "center" }}>
                <p style={{ fontSize: 16, marginBottom: 10 }}>
                  {s.robberTarget}番のプレイヤーと役職を交換しました
                </p>
                <img src={s.robberNewRole.img} width={70} alt={s.robberNewRole.name} />
                <p style={{ fontSize: 20, fontWeight: "bold", marginTop: 8 }}>あなたの新しい役職：{s.robberNewRole.name}</p>
                {s.robberNewRole.id === "werewolf" && (
                  <p style={{ fontSize: 14, opacity: 0.75, marginTop: 6 }}>※夜行動はすでに終了しているため、仲間の確認はできません</p>
                )}
                <button
                  onClick={s.robberNewRole.id === "werewolf" ? s.confirmRobberResult : s.nextNightPlayer}
                  style={{ marginTop: 16, padding: "10px 32px", borderRadius: 10, border: "none", background: "#5b86e5", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: "bold" }}
                >
                  {s.robberNewRole.id === "werewolf" ? "確認済" : "次のプレイヤーへ"}
                </button>
              </div>
            )}

            {/* 占い師：選択タイプ */}
            {roleId === "seer" && s.seerChoiceType === null && (
              <>
                <p style={{ fontSize: 16 }}>占い方法を選んでください</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 220 }}>
                  <button
                    onClick={() => s.handleSeerTypeSelect("player")}
                    style={{ padding: "14px 0", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.75)", color: "#333", fontSize: 17, fontWeight: "bold", cursor: "pointer" }}
                  >
                    🔍 プレイヤーを占う
                  </button>
                  <button
                    onClick={() => s.handleSeerTypeSelect("center")}
                    style={{ padding: "14px 0", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.75)", color: "#333", fontSize: 17, fontWeight: "bold", cursor: "pointer" }}
                  >
                    🃏 残り2枚を確認する
                  </button>
                </div>
              </>
            )}

            {/* 占い師：プレイヤー選択 */}
            {roleId === "seer" && s.seerChoiceType === "player" && s.seerResult === null && (
              <>
                <p style={{ fontSize: 16 }}>占うプレイヤーを選んでください</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 8 }}>
                  {otherPlayers.map(p => p && (
                    <button
                      key={p.id}
                      onClick={() => s.handleSeerPlayerSelect(p.id)}
                      style={{ padding: "12px 20px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.75)", color: "#333", fontSize: 18, fontWeight: "bold", cursor: "pointer" }}
                    >
                      {p.id}番
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 占い師：プレイヤー結果 */}
            {roleId === "seer" && s.seerResult !== null && !s.showNextButton && (
              <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 14, padding: "20px 28px", textAlign: "center" }}>
                <p style={{ fontSize: 16, marginBottom: 10 }}>{s.seerTarget}番のプレイヤーの役職</p>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <img src={s.seerResult.img} width={70} alt={s.seerResult.name} />
                </div>
                <p style={{ fontSize: 20, fontWeight: "bold", marginTop: 8 }}>{s.seerResult.name}</p>
                <button
                  onClick={s.confirmSeerResult}
                  style={{ marginTop: 16, padding: "10px 32px", borderRadius: 10, border: "none", background: "#5b86e5", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: "bold" }}
                >
                  確認済
                </button>
              </div>
            )}

            {/* 占い師：中央2枚結果 */}
            {roleId === "seer" && s.seerCenterResult !== null && !s.showNextButton && (
              <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 14, padding: "20px 28px", textAlign: "center" }}>
                <p style={{ fontSize: 16, marginBottom: 10 }}>配役されなかった2枚の役職</p>
                <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
                  {s.seerCenterResult.map((role, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <img src={role.img} width={60} alt={role.name} />
                      <p style={{ fontSize: 17, fontWeight: "bold", marginTop: 6 }}>{role.name}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={s.confirmSeerResult}
                  style={{ marginTop: 16, padding: "10px 32px", borderRadius: 10, border: "none", background: "#5b86e5", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: "bold" }}
                >
                  確認済
                </button>
              </div>
            )}

            {/* 次のプレイヤーへ */}
            {s.showNextButton && (
              <button onClick={s.nextNightPlayer} className={styles.blueButton}>
                {s.currentPlayer < s.players.length ? "次のプレイヤーへ" : "夜が明けます"}
              </button>
            )}

          </div>
        )}

        {/* 人狼仲間モーダル */}
        {s.wolfModalOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
            <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,100,100,0.4)", borderRadius: 16, padding: 28, width: 300, color: "#fff", textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>👥 仲間の人狼</p>
              {wolfAllies.length === 0 ? (
                <p style={{ opacity: 0.7 }}>あなたは一匹狼です</p>
              ) : (
                wolfAllies.map(p => p && (
                  <p key={p.id} style={{ fontSize: 18, marginBottom: 8 }}>{p.id}番のプレイヤー</p>
                ))
              )}
              <button
                onClick={() => s.setWolfModalOpen(false)}
                style={{ marginTop: 16, padding: "10px 32px", borderRadius: 10, border: "none", background: "rgba(220,50,50,0.8)", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: "bold" }}
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===================== 朝・議論 =====================
  if (s.phase === "morning" || s.phase === "discussion") {
    const isDiscussion = s.phase === "discussion"
    return (
      <div style={{
        ...bgStyle(s.theme, isDiscussion ? "bg_day.png" : "bg_morning.png"),
        backgroundColor: s.timerRunning ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.45)",
      }}>
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <h1 style={{ fontSize: 34, textShadow: "0 3px 12px rgba(0,0,0,0.6)", letterSpacing: 2 }}>
            {isDiscussion ? "議論タイム" : "朝になりました"}
          </h1>
        </div>

        {isDiscussion && (
          <div style={{ marginTop: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 64, fontWeight: "bold", letterSpacing: 4, textShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
              {s.formatTime(s.timeLeft)}
            </div>

            {s.discussionReady && !s.discussionEnded && (
              <div style={{ display: "flex", gap: 12 }}>
                {s.timerRunning ? (
                  <button onClick={s.pauseTimer} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 16, cursor: "pointer" }}>
                    一時停止
                  </button>
                ) : (
                  <button onClick={s.startTimer} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 16, cursor: "pointer" }}>
                    再開
                  </button>
                )}
                <button onClick={s.endDiscussion} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 16, cursor: "pointer" }}>
                  議論スキップ
                </button>
              </div>
            )}

            {!s.discussionReady && (
              <p style={{ fontSize: 18, opacity: 0.8 }}>準備中...</p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ===================== 投票開始 =====================
  if (s.phase === "voteStart") {
    return (
      <div style={bgStyle(s.theme, "bg_vote.png")}>
        <h1 style={{ fontSize: 34, letterSpacing: 3, textShadow: "0 3px 16px rgba(0,0,0,0.6)" }}>投票タイム</h1>
        <p style={{ fontSize: 18, opacity: 0.85 }}>処理中...</p>
      </div>
    )
  }

  // ===================== 投票 =====================
  if (s.phase === "vote") {
    return (
      <div style={{
        ...bgStyle(s.theme, s.theme === "mama" ? "bg_vote.png" : "bg_day.png"),
        backgroundColor: "rgba(0,0,0,0.25)",
      }}>
        <h1 style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", fontSize: 34, textShadow: "0 3px 12px rgba(0,0,0,0.6)", letterSpacing: 2 }}>
          追放者決定
        </h1>

        <p style={{ marginTop: 60, fontSize: 15, opacity: 0.85 }}>追放するプレイヤーを選択（複数可）</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 6 }}>
          {s.players.map(p => p && (
            <button
              key={p.id}
              onClick={() => s.toggleVoteTarget(p.id)}
              style={{
                width: 160, padding: 12, fontSize: 18, borderRadius: 12,
                border: s.voteTargets.includes(p.id) ? "3px solid #ff6b6b" : "1px solid rgba(255,255,255,0.25)",
                background: s.voteTargets.includes(p.id) ? "rgba(255,107,107,0.7)" : "rgba(255,255,255,0.6)",
                color: "#222", fontWeight: "bold", cursor: "pointer",
              }}
            >
              {p.id}番
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          {s.voteTargets.length > 0 && (
            <button
              onClick={s.executeSelected}
              style={{ padding: "14px 32px", fontSize: 20, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#ff6b6b,#c0392b)", color: "#fff", fontWeight: "bold", cursor: "pointer", boxShadow: "0 6px 16px rgba(0,0,0,0.35)" }}
            >
              {s.voteTargets.map(n => `${n}番`).join("・")}を追放
            </button>
          )}
          <button
            onClick={s.declarePeace}
            style={{ padding: "14px 32px", fontSize: 20, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#a8e6cf,#3d9970)", color: "#fff", fontWeight: "bold", cursor: "pointer", boxShadow: "0 6px 16px rgba(0,0,0,0.35)" }}
          >
            🕊 平和
          </button>
        </div>
      </div>
    )
  }

  // ===================== 勝利発表 =====================
  if (s.phase === "result") {
    const isVillage = s.winner === "village"
    const bgImg = isVillage ? "bg_win_village.png" : "bg_win_wolf.png"
    const winnerLabel =
      s.winner === "village" ? "村人陣営の勝利" :
      s.winner === "wolf"    ? "人狼陣営の勝利" : "全員敗北"

    return (
      <div style={{
        background: `url(/image/${s.theme}/${bgImg}) center / ${s.theme === "mama" ? "contain" : "cover"} no-repeat`,
        backgroundColor: "rgba(0,0,0,0.4)",
        backgroundBlendMode: "darken",
        color: "white",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}>
        <div style={{ fontSize: 42, fontWeight: "bold", letterSpacing: 4, textShadow: "0 4px 16px rgba(0,0,0,0.6)" }}>
          {winnerLabel}
        </div>

        {!s.isPeace && s.executedPlayers.length > 0 && (
          <p style={{ fontSize: 18, opacity: 0.85 }}>
            追放：{s.executedPlayers.map(n => `${n}番`).join("・")}
          </p>
        )}
        {s.isPeace && (
          <p style={{ fontSize: 18, opacity: 0.85 }}>平和（追放なし）</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 240 }}>
          <button
            onClick={() => s.setPhase("reveal")}
            style={{ padding: "14px 0", fontSize: 18, fontWeight: "bold", borderRadius: 12, border: "none", background: "rgba(255,255,255,0.25)", color: "#fff", cursor: "pointer" }}
          >
            🔍 ネタバラシ
          </button>
          <button
            onClick={() => s.setPhase("setup")}
            style={{ padding: "14px 0", fontSize: 18, fontWeight: "bold", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6bd4ff,#2b8cff)", color: "#fff", cursor: "pointer" }}
          >
            もう一度
          </button>
          <button
            onClick={() => router.push("/")}
            style={{ padding: "12px 0", fontSize: 16, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer" }}
          >
            トップへ
          </button>
        </div>
      </div>
    )
  }

  // ===================== ネタバラシ =====================
  if (s.phase === "reveal") {
    return (
      <div style={{ padding: 20, minHeight: "100vh", background: "#1a1a2e", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h1 style={{ fontSize: 26, letterSpacing: 2, marginBottom: 20, marginTop: 10 }}>🔍 ネタバラシ</h1>

        <div style={{ width: "100%", maxWidth: 400 }}>
          <h2 style={{ fontSize: 18, marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: 6 }}>プレイヤーの役職</h2>
          {s.originalPlayers.map((orig, i) => {
            const current = s.players[i]
            const changed = current && orig.role.id !== current.role.id
            const isExecuted = s.executedPlayers.includes(orig.id)
            return (
              <div key={orig.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: isExecuted ? "rgba(220,50,50,0.2)" : "rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 16, minWidth: 36, opacity: 0.7 }}>{orig.id}番</span>
                <img src={orig.role.img} width={44} alt={orig.role.name} />
                <span style={{ fontSize: 15 }}>{orig.role.name}</span>
                {changed && current && (
                  <>
                    <span style={{ fontSize: 18, opacity: 0.6 }}>→</span>
                    <img src={current.role.img} width={44} alt={current.role.name} />
                    <span style={{ fontSize: 15, color: "#ffd700" }}>{current.role.name}</span>
                    {s.robberPlayerNum === orig.id && (
                      <span style={{ fontSize: 12, opacity: 0.7 }}>（怪盗）</span>
                    )}
                  </>
                )}
                {isExecuted && <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.7 }}>追放</span>}
              </div>
            )
          })}

          <h2 style={{ fontSize: 18, marginBottom: 10, marginTop: 20, borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: 6 }}>残りの2枚（センター）</h2>
          <div style={{ display: "flex", gap: 20 }}>
            {s.centerCards.map((card, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>
                <img src={card.img} width={50} alt={card.name} />
                <span style={{ fontSize: 14 }}>{card.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button
            onClick={() => s.setPhase("setup")}
            style={{ padding: "14px 32px", fontSize: 18, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6bd4ff,#2b8cff)", color: "#fff", fontWeight: "bold", cursor: "pointer" }}
          >
            もう一度
          </button>
          <button
            onClick={() => router.push("/")}
            style={{ padding: "14px 24px", fontSize: 16, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer" }}
          >
            トップへ
          </button>
        </div>
      </div>
    )
  }

  return null
}
