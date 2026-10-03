import fs from '@ohos.file.fs';

export interface CaseReport {
  name: string;
  status: string;
  durationMs: number;
  error?: string;
}

export interface SuiteReport {
  schemaVersion: number;
  mode: string;
  origin: string;
  state: string;
  passed: number;
  failed: number;
  durationMs: number;
  cases: CaseReport[];
  jsErrors: string[];
  error?: string;
}

interface FinalReport {
  schemaVersion: number;
  state: string;
  origin: string;
  pendingModes: string[];
  passed: number;
  failed: number;
  suites: SuiteReport[];
  writeError?: string;
}

/** Store receipts in private files/. Pending and watchdog states never claim JS success. */
export class RegressionRunStore {
  private filesDir: string;
  private suites: SuiteReport[] = [];
  private onSuite: (report: SuiteReport) => void;
  private timers: Map<string, number> = new Map();
  private writeError: string = '';

  constructor(filesDir: string, onSuite: (report: SuiteReport) => void) {
    this.filesDir = filesDir;
    this.onSuite = onSuite;
    this.writeReport('dsbridge-regression-ds3.json', this.pending('DS3'));
    this.writeReport('dsbridge-regression-ds2.json', this.pending('DS2'));
    this.writeFinal();
  }

  private pending(mode: string): SuiteReport {
    return {
      schemaVersion: 1, mode: mode, origin: 'native-init', state: 'pending',
      passed: 0, failed: 0, durationMs: 0, cases: [], jsErrors: []
    };
  }

  start(mode: string): void {
    const timer = setTimeout(() => {
      this.fail(mode, 'ArkWeb suite did not return a report within 90 seconds.');
    }, 90000);
    this.timers.set(mode, timer);
  }

  accept(mode: string, rawReport: string): string {
    try {
      const report = JSON.parse(rawReport) as SuiteReport;
      if (report.schemaVersion !== 1 || report.mode !== mode ||
          report.origin !== 'arkweb-javascript' || report.state !== 'complete' ||
          !Array.isArray(report.cases) || !Array.isArray(report.jsErrors)) {
        throw new Error('Invalid ArkWeb suite report envelope.');
      }
      const passed = report.cases.filter((entry: CaseReport) => entry.status === 'pass').length;
      const failed = report.cases.filter((entry: CaseReport) => entry.status === 'fail').length;
      if (passed !== report.passed || failed !== report.failed ||
          passed + failed !== report.cases.length || report.cases.length < 10) {
        throw new Error('Report case counts are incomplete or inconsistent.');
      }
      if (this.suites.some((suite: SuiteReport) => suite.mode === mode)) {
        return 'already-recorded';
      }
      this.finish(report);
      return 'saved';
    } catch (error) {
      this.fail(mode, 'Report rejected: ' + String(error));
      return 'rejected';
    }
  }

  fail(mode: string, error: string): void {
    if (this.suites.some((suite: SuiteReport) => suite.mode === mode)) {
      return;
    }
    this.finish({
      schemaVersion: 1, mode: mode, origin: 'native-watchdog', state: 'failed',
      passed: 0, failed: 1, durationMs: 90000, cases: [{
        name: 'suite-report', status: 'fail', durationMs: 0, error: error
      }], jsErrors: [], error: error
    });
  }

  private finish(report: SuiteReport): void {
    const timer = this.timers.get(report.mode);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(report.mode);
    }
    this.suites.push(report);
    try {
      this.writeReport('dsbridge-regression-' + report.mode.toLowerCase() + '.json', report);
      this.writeFinal();
      this.onSuite(report);
    } catch (error) {
      // Disk failure cannot silently leave the UI waiting after clearing its timer.
      const failedReport: SuiteReport = {
        schemaVersion: 1, mode: report.mode, origin: 'native-storage', state: 'failed',
        passed: 0, failed: 1, durationMs: report.durationMs,
        cases: [{ name: 'persist-receipt', status: 'fail', durationMs: 0, error: String(error) }],
        jsErrors: [], error: String(error)
      };
      this.suites[this.suites.length - 1] = failedReport;
      this.onSuite(failedReport);
      throw error;
    }
  }

  private writeFinal(): void {
    const pendingModes = ['DS3', 'DS2'].filter((mode: string) =>
      !this.suites.some((suite: SuiteReport) => suite.mode === mode));
    const report: FinalReport = {
      schemaVersion: 1,
      state: pendingModes.length > 0 ? 'pending' :
        (this.suites.some((suite: SuiteReport) => suite.failed > 0) ? 'failed' : 'complete'),
      origin: 'native-aggregate-of-arkweb-reports',
      pendingModes: pendingModes,
      passed: this.suites.reduce((sum: number, suite: SuiteReport) => sum + suite.passed, 0),
      failed: this.suites.reduce((sum: number, suite: SuiteReport) => sum + suite.failed, 0),
      suites: this.suites.slice(), writeError: this.writeError || undefined
    };
    this.writeReport('dsbridge-regression-final.json', report);
  }

  private writeReport(fileName: string, report: Object): void {
    let file: fs.File | undefined;
    try {
      file = fs.openSync(this.filesDir + '/' + fileName,
        fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY | fs.OpenMode.TRUNC);
      fs.writeSync(file.fd, JSON.stringify(report, null, 2));
    } catch (error) {
      this.writeError = String(error);
      throw new Error('Cannot persist regression receipt: ' + this.writeError);
    } finally {
      if (file !== undefined) { fs.closeSync(file); }
    }
  }

  stop(): void {
    this.timers.forEach((timer: number) => clearTimeout(timer));
    this.timers.clear();
  }
}
