# Lykke Samling

> 작은 행복을 모으는 곳

---

## 시작하기 전에 필요한 것

- Node.js 설치 확인: PowerShell에서 `node -v` (없으면 nodejs.org에서 설치)
- GitHub 계정
- Supabase 계정 (supabase.com — GitHub 로그인)
- Vercel 계정 (vercel.com — GitHub 로그인)

---

## 1단계 — Supabase 세팅

### 프로젝트 생성

1. supabase.com 접속 → New Project
2. 이름: `lykke-samling`, 비밀번호 설정, 지역: Northeast Asia (Seoul)

### 테이블 생성

SQL Editor에서 실행:

```sql
create table entries (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  date text not null,
  text text not null,
  image_url text
);

-- 누구나 읽고 쓸 수 있도록 (혼자 쓰는 앱이라 단순하게)
alter table entries enable row level security;
create policy "allow all" on entries for all using (true) with check (true);
```

### Storage 생성

1. Storage → New bucket
2. 이름: `photos`, Public 체크 → Create

### API 키 복사

Settings → API에서:

- `Project URL` 복사
- `anon public` 키 복사

---

## 2단계 — 로컬 세팅

```bash
# 이 폴더에서 PowerShell 열고
npm install

# .env.local 파일 만들기
# (아래 내용 복붙하고 실제 값으로 채우기)
```

`.env.local` 파일 만들어서:

```
NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_key
```

```bash
# 로컬 실행
npm run dev
# → http://localhost:3000 에서 확인
```

---

## 3단계 — 앱 아이콘 만들기

`public/icons/` 폴더에 이미지 두 개 넣어야 해:

- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)

Canva나 아무 이미지 툴에서 만들어도 됨. 임시로는 아무 이미지 넣어도 동작함.

---

## 4단계 — Vercel 배포

```bash
# GitHub에 올리기
git init
git add .
git commit -m "Lykke Samling 첫 배포"
```

GitHub에서 새 repository 만들고 push.

그 다음 Vercel에서:

1. New Project → GitHub repo 선택
2. Environment Variables에 `.env.local` 값 두 개 추가
3. Deploy

→ `lykkesamling.vercel.app` 같은 URL 생성됨

---

## 5단계 — 폰에 설치 (PWA)

### 아이폰

1. Safari에서 배포된 URL 접속
2. 하단 공유 버튼 → "홈 화면에 추가"
3. 완료 — 앱처럼 열림

### 안드로이드

1. Chrome에서 접속
2. 주소창 옆 "설치" 버튼 또는 메뉴 → "앱 설치"
3. 완료

---

## 선택: 커스텀 도메인 연결

Vercel에서 Settings → Domains → `lykkesamling.com` 추가
Namecheap에서 DNS 설정 안내대로 따라가면 됨.

---

## 파일 구조

```
lykke-samling/
├── src/
│   ├── app/
│   │   ├── layout.tsx     # PWA 메타태그, 폰트
│   │   ├── page.tsx       # 메인 앱
│   │   └── globals.css    # 전역 스타일
│   └── lib/
│       └── supabase.ts    # DB 클라이언트
├── public/
│   ├── manifest.json      # PWA 설정
│   └── icons/             # 앱 아이콘
├── next.config.js         # PWA 설정
├── .env.local             # 환경변수 (직접 만들기)
└── package.json
```
