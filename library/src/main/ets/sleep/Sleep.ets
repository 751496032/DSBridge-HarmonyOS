import { LogUtils } from '../utils/LogUtils'
import { BaseSendable } from './BaseSendable'
import { taskpool } from '@kit.ArkTS'



@Concurrent
async function run(sendable: BaseSendable) {
  // LogUtils.d(`task start: ${Date.now()}`)
  await sendable.run()
  await sendable.complete()
  // LogUtils.d(`task end: ${Date.now()}  ${sendable.isCompleted}`)
}

/**
 * 不建议做耗时过长的任务，当任务超过3s，无论是否执行完毕都会结束，数据会丢失
 * 为何是3s呢，当主线程阻塞超过3s时，系统会发生anr无响应异常，闪退。
 * @param args
 * @returns
 */
export function sleep<T extends BaseSendable>(args: BaseSendable) : T{
  const task: taskpool.Task = new taskpool.Task(run, args)
  task.name = args.key
  taskpool.execute(task)
  let currentTime = Date.now()
  while (Date.now() - currentTime < 3000) {
    if (args.isCompleted) {
      break
    }
  }

  if (taskpool.getTaskPoolInfo()?.taskInfos[0]?.state === taskpool.State.WAITING) {
    LogUtils.d(`task cacenl `)
    taskpool.cancel(task)
  }
  LogUtils.d(`task result: ${args.isCompleted}  ${args.key}`)
  return args as T
}