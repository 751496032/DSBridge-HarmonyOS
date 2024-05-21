import { LogUtils } from '../utils/LogUtils'
import { BaseSendable } from './BaseSendable'
import { taskpool } from '@kit.ArkTS'


@Concurrent
async function run(sendable: BaseSendable) {
  const currentTime = Date.now()
  await sendable.run()
  await sendable.complete()
  if (sendable.enableLog) {
    LogUtils.d(`${sendable.tag} task time: ${Date.now() - currentTime}`)
  }

}

/**
 * 通过sleep方法可以在主线程同步方法内执行串行异步并发任务，主线程会同步等待异步结果
 * 不建议做耗时过长的任务，当任务超过3s，无论是否执行完毕都会结束，数据可能会丢失
 * 为何是3s呢，当主线程阻塞超过3s时，系统会发生anr无响应异常，闪退。
 * @param args
 * @returns
 */
export function taskWait<T extends BaseSendable>(args: BaseSendable): T {
  const task: taskpool.Task = new taskpool.Task(run, args)
  taskpool.execute(task)
  let currentTime = Date.now()
  while (true) {
    if (Date.now() - currentTime < 3000) {
      if (args.isCompleted) {
        break
      }
    } else {
      break
    }
  }
  if (!args.isCompleted) {
    taskpool.getTaskPoolInfo().taskInfos.forEach((v) => {
      if (args.enableLog) {
        LogUtils.d(`${args.tag} task info: ${JSON.stringify(v)}`)
      }
      try {
        taskpool.cancel(task)
      } catch (e) {
        LogUtils.e(JSON.stringify(e))
      }
    })
  }
  if (args.enableLog) {
    LogUtils.d(`${args.tag} task result: ${JSON.stringify(args)} time: ${Date.now() - currentTime}`)
  }
  return args as T
}