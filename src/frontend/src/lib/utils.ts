import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS 클래스들을 조건부로 결합하고 중복을 정리하는 유틸리티 함수
 * Shadcn UI 컴포넌트의 필수 기반 함수입니다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
