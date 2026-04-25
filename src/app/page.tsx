"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type Entry = {
  id: string;
  date: string;
  text: string;
  image_url: string | null;
  created_at: string;
};

export default function Home() {
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const todayKey = () => new Date().toISOString().slice(0, 10);

  const todayFull = () =>
    new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

  const fmtDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });

  const streak = (() => {
    const days = [...new Set(entries.map((e) => e.date))].sort().reverse();
    let s = 0,
      c = todayKey();
    for (const d of days) {
      if (d === c) {
        s++;
        const dd = new Date(c);
        dd.setDate(dd.getDate() - 1);
        c = dd.toISOString().slice(0, 10);
      } else break;
    }
    return s;
  })();

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    setLoading(true);
    const { data } = await supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setEntries(data);
    setLoading(false);
  }

  async function handleSave() {
    console.log("clicked", text);

    if (!text.trim() || saving) return;
    setSaving(true);

    let image_url = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const filename = `${Date.now()}.${ext}`;
      const { data: uploadData, error } = await supabase.storage
        .from("photos")
        .upload(filename, imageFile, { contentType: imageFile.type });

      if (uploadData && !error) {
        const { data: urlData } = supabase.storage
          .from("photos")
          .getPublicUrl(uploadData.path);
        image_url = urlData.publicUrl;
      }
    }

    console.log("before insert");

    const { error } = await supabase.from("entries").insert({
      date: todayKey(),
      text: text.trim(),
      image_url,
    });
    console.log("after insert", error);
    if (!error) {
      setText("");
      setImageFile(null);
      setPreview(null);
      setToast(true);
      setTimeout(() => setToast(false), 2200);
      fetchEntries();
    }

    setSaving(false);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "2rem 1.25rem 4rem",
        position: "relative",
      }}
    >
      {/* 로고 */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "2.5rem",
          paddingBottom: "2rem",
          borderBottom: "0.5px solid #e0e0dc",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            fontSize: 34,
            letterSpacing: "0.12em",
            color: "var(--color-ink)",
          }}
        >
          Lykke <span style={{ fontStyle: "italic" }}>Samling</span>
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "var(--color-muted)",
            marginTop: 6,
            textTransform: "uppercase",
          }}
        >
          행복을 모으는 사람
        </div>
      </div>

      {/* 날짜 */}
      <div
        style={{
          fontSize: 11,
          color: "var(--color-muted)",
          letterSpacing: "0.08em",
          marginBottom: "1.25rem",
          textAlign: "center",
        }}
      >
        {todayFull()}
      </div>

      {/* 스트릭 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 44,
            fontWeight: 300,
            lineHeight: 1,
            color: "var(--color-ink)",
          }}
        >
          {streak}일
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--color-muted)",
              marginBottom: 8,
            }}
          >
            연속 기록
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background:
                    i < streak ? "var(--color-ink)" : "var(--color-faint)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 사진 업로드 */}
      <input
        type="file"
        accept="image/*"
        ref={fileRef}
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: `0.5px ${preview ? "solid" : "dashed"} #d0d0cc`,
          borderRadius: 16,
          height: preview ? 260 : 130,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          overflow: "hidden",
          marginBottom: "1.25rem",
          position: "relative",
          transition: "height 0.3s",
          background: preview ? "transparent" : "var(--color-surface)",
        }}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
            >
              <span
                style={{ color: "#fff", fontSize: 12, letterSpacing: "0.1em" }}
              >
                사진 바꾸기
              </span>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#aaa"
              strokeWidth="1"
              style={{
                marginBottom: 8,
                display: "block",
                margin: "0 auto 8px",
              }}
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <circle cx="12" cy="14" r="3.5" />
              <path d="M8 7l1.5-3h5L16 7" />
            </svg>
            <div
              style={{
                fontSize: 12,
                color: "var(--color-muted)",
                letterSpacing: "0.06em",
              }}
            >
              사진 추가
            </div>
          </div>
        )}
      </div>

      {/* 텍스트 입력 */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={100}
        rows={2}
        placeholder="오늘, 어떤 순간이 좋았어?"
        style={{
          width: "100%",
          border: "none",
          borderBottom: "0.5px solid #d0d0cc",
          padding: "8px 0",
          background: "transparent",
          resize: "none",
          fontFamily: "var(--font-display)",
          fontSize: 20,
          fontWeight: 300,
          fontStyle: "italic",
          color: "var(--color-ink)",
          lineHeight: 1.55,
          outline: "none",
          marginBottom: 4,
        }}
      />
      <div
        style={{
          textAlign: "right",
          fontSize: 11,
          color: "var(--color-muted)",
          marginBottom: "1.5rem",
          letterSpacing: "0.05em",
        }}
      >
        {text.length} / 100
      </div>

      {/* 저장 버튼 */}
      <button
        onClick={handleSave}
        disabled={saving || !text.trim()}
        style={{
          width: "100%",
          padding: "12px",
          background: "var(--color-ink)",
          color: "#fafaf9",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          fontFamily: "var(--font-body)",
          fontWeight: 300,
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          opacity: saving || !text.trim() ? 0.25 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {saving ? "저장 중..." : "기록하기"}
      </button>

      {/* 구분선 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          margin: "2.5rem 0",
        }}
      >
        <div style={{ flex: 1, height: "0.5px", background: "#e0e0dc" }} />
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--color-muted)",
          }}
        >
          Samling
        </div>
        <div style={{ flex: 1, height: "0.5px", background: "#e0e0dc" }} />
      </div>

      {/* 피드 */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 0",
            fontSize: 12,
            color: "var(--color-muted)",
            letterSpacing: "0.08em",
          }}
        >
          불러오는 중...
        </div>
      ) : entries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 0",
            fontSize: 13,
            color: "var(--color-muted)",
          }}
        >
          첫 순간을 남겨봐.
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}
        >
          {entries.map((e) => (
            <div
              key={e.id}
              style={{ borderTop: "0.5px solid #e8e8e4", paddingTop: "1.5rem" }}
            >
              {e.image_url && (
                <img
                  src={e.image_url}
                  alt=""
                  style={{
                    width: "100%",
                    maxHeight: 260,
                    objectFit: "cover",
                    borderRadius: 10,
                    marginBottom: 12,
                    display: "block",
                  }}
                />
              )}
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--color-muted)",
                  marginBottom: 6,
                }}
              >
                {fmtDate(e.date)}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 19,
                  fontWeight: 300,
                  fontStyle: "italic",
                  lineHeight: 1.55,
                  color: "var(--color-ink)",
                }}
              >
                {e.text}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--color-ink)",
            color: "#fafaf9",
            fontSize: 11,
            letterSpacing: "0.12em",
            padding: "8px 20px",
            borderRadius: 99,
            whiteSpace: "nowrap",
            zIndex: 999,
          }}
        >
          저장됐어
        </div>
      )}
    </main>
  );
}
