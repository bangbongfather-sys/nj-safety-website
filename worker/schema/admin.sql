-- 관리자 계정. 이전에는 Cloudflare 시크릿(ADMIN_USERS)에 JSON 으로
-- 넣어 뒀는데, 직원 한 명 추가하는 데도 터미널을 열어야 했다. 여기로
-- 옮기면 관리자 페이지에서 바로 만들고 바꿀 수 있다.
--
-- 비밀번호 자체는 저장하지 않는다. PBKDF2-SHA256 해시만 남으므로
-- 이 표를 통째로 들여다봐도 비밀번호를 되돌릴 수 없다.
CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY,           -- 아이디 (소문자로 정규화해 저장)
  display_name  TEXT NOT NULL DEFAULT '',   -- 화면에 보일 이름
  salt          TEXT NOT NULL,
  hash          TEXT NOT NULL,
  iterations    INTEGER NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff',  -- 'owner' | 'staff'
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  last_login_at TEXT
);

-- 세션 서명키처럼 서버만 아는 값. 시크릿으로 두면 배포 때마다 사람이
-- 챙겨야 해서, 처음 필요할 때 Worker 가 스스로 만들어 여기 넣는다.
CREATE TABLE IF NOT EXISTS admin_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
