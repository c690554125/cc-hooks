import { useEffect, useCallback, useRef } from 'react'

function useScrollInEyes(config, dep) {
  const {
    wrap: scrollWrap,
    target: listenTarget,
    callback: listenDoWhat, // 提供一个接收解除监听的回调函数
    realTarget, // 针对列表渲染的，判断真正的列表项容器
    errRemoveListen = false
  } = config

  // 移除的监听，即便effect触发，也需要再次添加监听。优化。
  const isRemoveListener = useRef(false)

  // 已经在执行用户的回调，则不在去执行回调。优化
  let runCallback = false

  let scrollWrapDom = null
  let listenTargetDom = null
  let scrollWrapDomHeight = 0
  let listenTargetDomHeight = 0
  let listenTargetDomOffsetTop = 0

  const scrollInEyesCallback = useCallback(event => {
    if (runCallback) {
      return
    }
    // 获取滚动距离
    const scrollTop = event.target.scrollTop
    // 元素距离容器顶部距离差 < 容器高度 则进入容器可视区域。
    if (listenTargetDomOffsetTop - scrollTop <= scrollWrapDomHeight) {
      // 滚动期间如果元素距离顶部距离不为0，则可以执行回调
      if (listenTargetDomOffsetTop !== 0) {
        // 执行回调，拿到回调的返回值。普通函数将清理函数扔给调用方来手动使用。
        const callbackRes = listenDoWhat(removeListen)
        runCallback = true
        // 如果是Promise的话，在promise resolved状态来执行。
        if (
          Object.prototype.toString.call(callbackRes) === '[object Promise]'
        ) {
          callbackRes
            .then(res => {
              removeListen()
              runCallback = false
            })
            .catch(er => {
              if (errRemoveListen) {
                removeListen()
              }
              runCallback = false
            })
        } else {
          console.error(
            '传递给useScrollIntoView的callback需要是返回一个promise，否则滚动监听不会取消'
          )
        }
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

  const removeListen = useCallback(() => {
    scrollWrapDom.removeEventListener('scroll', scrollInEyesCallback)
    isRemoveListener.current = true
  }, [])

  useEffect(() => {
    // 如果已经是执行过callback，解除了监听。即便dep有变化，也不需要重新监听。
    if (isRemoveListener.current) {
      return
    }

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

export default useScrollInEyes
