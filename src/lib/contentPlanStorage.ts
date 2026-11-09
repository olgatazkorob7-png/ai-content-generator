import type { SavedPlan } from '../types';

const STORAGE_KEY = 'aicm:content-plans';

export function listPlans(): SavedPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: SavedPlan[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('[contentPlanStorage] Failed to read plans:', error);
    return [];
  }
}

export function savePlan(plan: SavedPlan): void {
  try {
    const current = listPlans();
    const filtered = current.filter((p) => p.id !== plan.id);
    const updated = [plan, ...filtered].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[contentPlanStorage] Failed to save plan:', error);
  }
}

export function deletePlan(id: string): void {
  try {
    const current = listPlans();
    const updated = current.filter((p) => String(p.id) !== String(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[contentPlanStorage] Failed to delete plan:', error);
  }
}

export function clearAllPlans(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[contentPlanStorage] Failed to clear all plans:', error);
  }
}

export function getPlan(id: string): SavedPlan | null {
  try {
    const current = listPlans();
    return current.find((p) => p.id === id) || null;
  } catch (error) {
    console.error('[contentPlanStorage] Failed to get plan:', error);
    return null;
  }
}

export function markPostPublished(planId: string, postIndex: number): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const plans: SavedPlan[] = JSON.parse(raw);
    const updated = plans.map((p) => {
      if (String(p.id) !== String(planId)) return p;
      const published = p.publishedPosts || [];
      if (published.includes(postIndex)) return p;
      return { ...p, publishedPosts: [...published, postIndex] };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('markPostPublished error:', e);
  }
}

export function getPostDate(planCreatedAt: string, day: number): Date {
  const start = new Date(planCreatedAt);
  start.setHours(0, 0, 0, 0);
  const result = new Date(start);
  result.setDate(start.getDate() + (day - 1));
  return result;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() === today.getTime();
}

export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${date.getFullYear()}`;
}
