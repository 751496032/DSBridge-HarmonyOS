import { CompleteHandler, JavaScriptInterface } from '@hzw/ohos-dsbridge';

interface AsyncRequest {
  value: string;
  delay: number;
  progress?: boolean;
}

interface ReportEnvelope {
  report: string;
}

interface Stats {
  syncCalls: number;
  asyncCalls: number;
  completedCalls: number;
  lastInput: string;
  errors: string[];
}

/** Fixture business methods. The actual call dispatch is the unmodified BaseBridge. */
export class RegressionNativeApi {
  private syncCalls: number = 0;
  private asyncCalls: number = 0;
  private completedCalls: number = 0;
  private lastInput: string = '';
  private errors: string[] = [];
  private reportSink: (report: string) => string;

  constructor(reportSink: (report: string) => string) {
    this.reportSink = reportSink;
  }

  recordError(message: string): void {
    this.errors.push(message);
  }

  @JavaScriptInterface(false)
  reset(input: string): string {
    this.syncCalls = 0;
    this.asyncCalls = 0;
    this.completedCalls = 0;
    this.lastInput = '';
    this.errors = [];
    return 'reset';
  }

  @JavaScriptInterface(false)
  stats(input: string): string {
    const stats: Stats = {
      syncCalls: this.syncCalls, asyncCalls: this.asyncCalls,
      completedCalls: this.completedCalls, lastInput: this.lastInput,
      errors: this.errors.slice()
    };
    return JSON.stringify(stats);
  }

  @JavaScriptInterface(false)
  sync(input: string): string {
    this.syncCalls++;
    this.lastInput = input;
    return 'sync:' + input;
  }

  @JavaScriptInterface(false)
  noArgument(): number {
    this.syncCalls++;
    return 7;
  }

  @JavaScriptInterface(false)
  zero(input: string): number { return 0; }

  @JavaScriptInterface(false)
  falseValue(input: string): boolean { return false; }

  @JavaScriptInterface(false)
  empty(input: string): string { return ''; }

  @JavaScriptInterface()
  delayed(input: string, handler: CompleteHandler): void {
    const request = JSON.parse(input) as AsyncRequest;
    this.asyncCalls++;
    this.lastInput = input;
    const delay = Math.max(20, Math.min(200, request.delay || 20));
    if (request.progress) {
      setTimeout(() => { handler.setProgressData('working:' + request.value); }, 5);
    }
    setTimeout(() => {
      this.completedCalls++;
      handler.complete('done:' + request.value);
    }, delay);
  }

  @JavaScriptInterface(false)
  report(input: string): string {
    const envelope = JSON.parse(input) as ReportEnvelope;
    return this.reportSink(envelope.report);
  }
}
