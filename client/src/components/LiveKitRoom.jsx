import { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom as LKRoom,
  useRoomContext,
  useLocalParticipant,
  useTracks,
  VideoTrack,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Track, RoomEvent } from "livekit-client";
import "@livekit/components-styles";
import { CYBER } from "../constants/theme";

export default function LiveKitRoom({ token, serverUrl, onDisconnect, onSpeakingChange, onReady, onTracksChanged }) {
  if (!token || !serverUrl) return null;

  return (
    <LKRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onDisconnected={onDisconnect}
      audio={{
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 48000,
        channelCount: 1,
      }}
      video={false}
      options={{
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          audioPreset: { maxBitrate: 64000 },
          dtx: true,
          red: true,
          videoCodec: 'vp8',
          videoSimulcastLayers: [],
          videoEncoding: { maxBitrate: 3_000_000, maxFramerate: 30 },
          screenShareEncoding: { maxBitrate: 2_000_000, maxFramerate: 30 },
          screenShareSimulcastLayers: [],
        },
        videoCaptureDefaults: {
          resolution: { width: 2560, height: 1440, frameRate: 30 },
        },
        screenShareCaptureDefaults: {
          audio: true,
          resolution: { width: 3840, height: 2160, frameRate: 60 },
          contentHint: 'detail',
          preferCurrentTab: false,
        },
      }}
    >
      <RoomAudioRenderer />
      <RoomController onSpeakingChange={onSpeakingChange} onReady={onReady} onTracksChanged={onTracksChanged} />
      <VideoArea />
    </LKRoom>
  );
}

// ── Video/Screen share rendering with toggle ───────────────────────────
function VideoArea() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  );
  const [hidden, setHidden] = useState({}); // {trackKey: true}
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    if (!expandedKey) return;
    const onKey = (e) => { if (e.key === "Escape") setExpandedKey(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expandedKey]);

  if (tracks.length === 0) return null;

  const screenTracks = tracks.filter(t => t.source === Track.Source.ScreenShare);
  const cameraTracks = tracks.filter(t => t.source === Track.Source.Camera);

  const toggleTrack = (key) => setHidden(p => ({ ...p, [key]: !p[key] }));

  return (
    <div style={{ padding: 8, height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Screen shares */}
      {screenTracks.map(t => {
        const key = t.participant.sid + "-screen";
        const isHidden = hidden[key];
        return (
          <div key={key} style={{ marginBottom: 6, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {/* Toggle bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "4px 10px", background: "#0a0a18", borderRadius: isHidden ? 6 : "6px 6px 0 0",
              border: `1px solid ${CYBER.cyan}30`,
              borderBottom: isHidden ? undefined : "none",
            }}>
              <span style={{ fontSize: 11, color: CYBER.cyan, fontWeight: 600 }}>
                🖥️ {t.participant.name || t.participant.identity} — Screen Share
              </span>
              <button onClick={(e) => { e.stopPropagation(); toggleTrack(key); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#b9bbbe",
                  fontSize: 10, padding: "2px 8px", borderRadius: 3, transition: "all .15s" }}
                onMouseOver={e => e.currentTarget.style.color = "#fff"}
                onMouseOut={e => e.currentTarget.style.color = "#b9bbbe"}>
                {isHidden ? "👁 Hiện" : "👁‍🗨 Ẩn"}
              </button>
            </div>
            {!isHidden && (
              <div onClick={() => setExpandedKey(key)} style={{
                position: "relative", borderRadius: "0 0 8px 8px", overflow: "hidden",
                border: `1px solid ${CYBER.cyan}30`, borderTop: "none",
                height: "100%", background: "#000", cursor: "zoom-in",
              }}>
                <VideoTrack trackRef={t} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            )}
          </div>
        );
      })}

      {/* Fullscreen overlay for expanded tile */}
      {expandedKey && (() => {
        const exp = tracks.find(t => (t.participant.sid + (t.source === Track.Source.ScreenShare ? "-screen" : "-cam")) === expandedKey);
        if (!exp) return null;
        return (
          <div onClick={() => setExpandedKey(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.92)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out",
            }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{ position: "relative", width: "92vw", height: "92vh", background: "#000", borderRadius: 8, overflow: "hidden", border: `1px solid ${CYBER.cyan}60` }}>
              <VideoTrack trackRef={exp} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              <div style={{ position: "absolute", top: 10, left: 14, padding: "4px 10px", background: "rgba(0,0,0,.6)", borderRadius: 4, fontSize: 12, color: CYBER.cyan, fontWeight: 600 }}>
                {exp.source === Track.Source.ScreenShare ? "🖥️" : "📹"} {exp.participant.name || exp.participant.identity}
              </div>
              <button onClick={() => setExpandedKey(null)}
                style={{ position: "absolute", top: 10, right: 14, padding: "6px 14px", background: "rgba(0,0,0,.7)", border: `1px solid ${CYBER.cyan}60`, borderRadius: 4, color: "#fff", fontSize: 12, cursor: "pointer" }}>
                ✕ Đóng (Esc)
              </button>
            </div>
          </div>
        );
      })()}

      {/* Camera feeds */}
      {cameraTracks.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          {cameraTracks.map(t => {
            const key = t.participant.sid + "-cam";
            const isHidden = hidden[key];
            return (
              <div key={key} style={{ position: "relative" }}>
                {!isHidden ? (
                  <div onClick={() => setExpandedKey(key)} style={{
                    borderRadius: 8, overflow: "hidden", border: `1px solid ${CYBER.border}`,
                    width: 220, height: 165, background: "#000", cursor: "zoom-in",
                  }}>
                    <VideoTrack trackRef={t} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{
                      position: "absolute", bottom: 4, left: 6, right: 6,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{
                        padding: "2px 8px", background: "rgba(0,0,0,.7)", borderRadius: 3,
                        fontSize: 9, color: "#dcddde",
                      }}>{t.participant.name || t.participant.identity}</span>
                      <button onClick={(e) => { e.stopPropagation(); toggleTrack(key); }}
                        style={{ padding: "2px 6px", background: "rgba(0,0,0,.7)", borderRadius: 3,
                          border: "none", cursor: "pointer", color: "#b9bbbe", fontSize: 9 }}>
                        Ẩn
                      </button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => toggleTrack(key)}
                    style={{
                      width: 220, height: 36, borderRadius: 6, cursor: "pointer",
                      background: "#0a0a18", border: `1px solid ${CYBER.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                    <span style={{ fontSize: 10, color: "#72767d" }}>
                      📹 {t.participant.name || t.participant.identity} — Bấm để hiện
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Room controller — speaking detection + expose controls ──────────────
function RoomController({ onSpeakingChange, onReady, onTracksChanged }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const lastSpeaking = useRef(false);
  const screenTracksRef = useRef({ video: null, audio: null });

  useEffect(() => {
    if (!room) return;
    console.log("[LiveKit] Connected to room:", room.name, "| Participants:", room.numParticipants);
    const onTrack = (pub, participant) => console.log("[LiveKit] Track subscribed:", pub.kind, "from", participant?.identity);
    const onUntrack = (pub, participant) => console.log("[LiveKit] Track unsubscribed:", pub.kind, "from", participant?.identity);
    room.on(RoomEvent.TrackSubscribed, onTrack);
    room.on(RoomEvent.TrackUnsubscribed, onUntrack);
    room.on(RoomEvent.ParticipantConnected, () => console.log("[LiveKit] Participant joined, total:", room.numParticipants));
    return () => {
      room.off(RoomEvent.TrackSubscribed, onTrack);
      room.off(RoomEvent.TrackUnsubscribed, onUntrack);
    };
  }, [room]);

  // Count REMOTE camera+screen tracks and notify parent.
  // Local tracks are the parent's source of truth (cameraOn/screenSharing state) —
  // counting them here causes a race: after unpublish, the publication may linger
  // in trackPublications for a microtask, keeping the container expanded.
  useEffect(() => {
    if (!room || !onTracksChanged) return;
    const recount = () => {
      let n = 0;
      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.trackPublications.values()) {
          if (pub.isSubscribed && pub.track && (pub.source === Track.Source.Camera || pub.source === Track.Source.ScreenShare)) n++;
        }
      }
      onTracksChanged(n);
    };
    // Delay to next microtask so LiveKit has finished updating trackPublications
    const debouncedRecount = () => setTimeout(recount, 0);
    const events = [
      RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackPublished, RoomEvent.TrackUnpublished,
      RoomEvent.TrackMuted, RoomEvent.TrackUnmuted,
      RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected,
      RoomEvent.Connected, RoomEvent.Reconnected,
    ];
    events.forEach(e => room.on(e, debouncedRecount));
    recount();
    return () => { events.forEach(e => room.off(e, debouncedRecount)); onTracksChanged(0); };
  }, [room, onTracksChanged]);

  // Expose controls
  useEffect(() => {
    if (!localParticipant || !onReady) return;
    onReady({
      setMicMuted: (muted) => {
        const pub = localParticipant.getTrackPublication('microphone');
        if (pub?.track) { if (muted) pub.track.mute(); else pub.track.unmute(); }
        else if (!muted) localParticipant.setMicrophoneEnabled(true);
      },
      setMicEnabled: (enabled) => localParticipant.setMicrophoneEnabled(enabled),
      setCameraEnabled: async (enabled) => {
        await localParticipant.setCameraEnabled(enabled);
        console.log("[LiveKit] Camera:", enabled);
      },
      setScreenShareEnabled: async (enabled) => {
        try {
          if (enabled) {
            // Get screen share with audio manually
            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
              audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
            });
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];
            if (videoTrack) {
              await localParticipant.publishTrack(videoTrack, { source: 'screen_share' });
            }
            if (audioTrack) {
              await localParticipant.publishTrack(audioTrack, { source: 'screen_share_audio' });
            }
            screenTracksRef.current = { video: videoTrack || null, audio: audioTrack || null };
            // Auto-stop when user clicks "Stop sharing" in browser
            videoTrack?.addEventListener('ended', () => {
              try { localParticipant.unpublishTrack(videoTrack); } catch {}
              if (audioTrack) { try { localParticipant.unpublishTrack(audioTrack); } catch {} }
              screenTracksRef.current = { video: null, audio: null };
            });
          } else {
            const { video, audio } = screenTracksRef.current;
            if (video) {
              try { localParticipant.unpublishTrack(video); } catch {}
              try { video.stop(); } catch {}
            }
            if (audio) {
              try { localParticipant.unpublishTrack(audio); } catch {}
              try { audio.stop(); } catch {}
            }
            screenTracksRef.current = { video: null, audio: null };
            // Fallback: also call built-in API in case anything was published that way
            try { await localParticipant.setScreenShareEnabled(false); } catch {}
          }
          console.log("[LiveKit] Screen share:", enabled, "with audio");
        } catch (e) {
          console.warn("[LiveKit] Screen share failed:", e.message);
        }
      },
      setNoiseSuppression: async (enabled) => {
        const pub = localParticipant.getTrackPublication('microphone');
        const track = pub?.track?.mediaStreamTrack;
        if (track?.applyConstraints) {
          try {
            await track.applyConstraints({ noiseSuppression: enabled, echoCancellation: true, autoGainControl: true });
          } catch (e) {}
        }
      },
      setUserVolume: (participantId, volume) => {
        if (!room) return;
        for (const p of room.remoteParticipants.values()) {
          if (String(p.identity) === String(participantId)) {
            for (const pub of p.audioTrackPublications.values()) {
              const el = pub.track?.attachedElements?.[0];
              if (el) el.volume = Math.min(2, Math.max(0, volume));
            }
          }
        }
      },
      getRoom: () => room,
    });
  }, [localParticipant, onReady]);

  // Speaking detection
  useEffect(() => {
    if (!localParticipant || !onSpeakingChange) return;
    const interval = setInterval(() => {
      const speaking = localParticipant.isSpeaking;
      if (speaking !== lastSpeaking.current) {
        lastSpeaking.current = speaking;
        onSpeakingChange(speaking);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [localParticipant, onSpeakingChange]);

  return null;
}
