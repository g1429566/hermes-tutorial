import Course from '@/components/Course';
import { loadCourseLessons } from '@/lib/course-content';

// 单页沉浸式应用：左侧固定导航 + 右侧章节内容，hash 路由（#/chapter-id）。
export default function Page() {
  return <Course lessons={loadCourseLessons()} />;
}
