import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** 先停用动画，查询结果返回后再按系统偏好启用；卸载时清理订阅。 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription?.remove(); };
  }, []);
  return reduced;
}
