import { useEffect, useCallback } from 'react'

function useScrollIntoView(config, dep) {
  const {
    wrap: scrollWrap,
    target: listenTarget,
    callback: listenDoWhat,
    realTarget // 针对列表渲染的，判断真正的列表项容器
  } = config

  let scrollWrapDom = null
  let listenTargetDom = null
  let scrollWrapDomHeight = 0
  let listenTargetDomHeight = 0
  let listenTargetDomOffsetTop = 0

  const scrollInEyesCallback = useCallback(event => {
    // 判断是否滚动到用户可视区域
    const scrollTop = event.target.scrollTop
    if (listenTargetDomOffsetTop - scrollTop <= scrollWrapDomHeight) {
      // 隐藏的项等到其display = block再执行
      if (listenTargetDomOffsetTop !== 0) {
        listenDoWhat()
        // 执行完就解除监听
        scrollWrapDom.removeEventListener('scroll', scrollInEyesCallback)
      } else {
        // 距离容器为0的话，判断元素是否还是display=none
        const isNone = getComputedStyle(listenTargetDom).display === 'none'
        // 如果已经不是none。则重新计算其offserTop
        if (!isNone) {
          listenTargetDomOffsetTop = listenTargetDom.offsetTop
        }
      }
    }
  }, [])

  const findRealTarget = useCallback(dom => {
    function find(dom) {
      const p = dom.parentElement
      if (p && p.classList.contains(realTarget)) {
        return p
      } else {
        return find(p)
      }
    }
    return find(dom)
  }, [])

  useEffect(() => {
    if (!scrollWrap || !listenTarget) {
      return
    }
    if (!scrollWrapDom || !listenTargetDom) {
      scrollWrapDom = scrollWrap.current || scrollWrap
      listenTargetDom = listenTarget.current || listenTarget
      if (realTarget && listenTargetDom) {
        listenTargetDom = findRealTarget(listenTargetDom)
      }
    }

    if (!scrollWrapDomHeight) {
      scrollWrapDomHeight = scrollWrapDom.clientHeight
    }
    if (!listenTargetDomHeight) {
      listenTargetDomHeight = listenTargetDom.clientHeight
    }
    if (!listenTargetDomOffsetTop) {
      listenTargetDomOffsetTop = listenTargetDom.offsetTop
    }

    // 如果加载时已经在容器显示区域内，则直接调用listenDoWhat
    if (listenTargetDomOffsetTop < scrollWrapDomHeight) {
      // 如果offsetTop是0的话，判断下是否是display:none的情况
      if (listenTargetDomOffsetTop === 0) {
        const isNone = getComputedStyle(listenTargetDom).display === 'none'
        if (isNone) {
          scrollWrapDom.addEventListener('scroll', scrollInEyesCallback)
        } else {
          listenDoWhat()
        }
      } else {
        listenDoWhat()
      }
    } else {
      scrollWrapDom.addEventListener('scroll', scrollInEyesCallback)
    }

    return function cleanListen() {
      scrollWrapDom.removeEventListener('scroll', scrollInEyesCallback)
    }
  }, [...dep])
}

export default useScrollIntoView
