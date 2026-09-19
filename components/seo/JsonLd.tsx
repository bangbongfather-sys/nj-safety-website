/**
 * 구조화 데이터를 페이지에 심는다.
 *
 * 서버 컴포넌트로 두어 정적 export 결과 HTML 안에 그대로 박히게 한다 —
 * 크롤러는 자바스크립트 실행 없이 HTML 만 읽는 경우가 많아, 클라이언트
 * 에서 주입하면 못 보고 지나간다.
 */
import { jsonLdString } from '@/lib/seo';

export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // 우리가 만든 객체를 직렬화한 것이라 사용자 입력이 섞이지 않는다.
      dangerouslySetInnerHTML={{ __html: jsonLdString(data) }}
    />
  );
}
