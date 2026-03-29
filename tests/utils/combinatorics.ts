export interface FlagSpec {
  [key: string]: (string | number | boolean)[];
}

export class Combinatorics {
  
  static generateFactorial(spec: FlagSpec): string[][] {
    const keys = Object.keys(spec);
    const result: string[][] = [];

    function combine(index: number, current: string[]) {
      if (index === keys.length) {
        result.push([...current]);
        return;
      }

      const key = keys[index];
      for (const value of spec[key]) {
        const flag = Combinatorics.formatFlag(key, value);
        if (flag) {
          current.push(flag);
        }
        combine(index + 1, current);
        if (flag) {
          current.pop();
        }
      }
    }

    combine(0, []);
    return result;
  }

  
  static generateRandom(spec: FlagSpec, iterations: number): string[][] {
    const result: string[][] = [];
    const keys = Object.keys(spec);

    for (let i = 0; i < iterations; i++) {
      const current: string[] = [];
      for (const key of keys) {
        const values = spec[key];
        const value = values[Math.floor(Math.random() * values.length)];
        const flag = this.formatFlag(key, value);
        if (flag) {
          current.push(flag);
        }
      }
      result.push(current);
    }

    return result;
  }

  private static formatFlag(key: string, value: any): string | null {
    if (value === "none" || value === false || value === undefined) return null;
    
    const flagName = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    
    if (typeof value === "boolean") {
      return `--${flagName}`;
    }
    
    return `--${flagName}=${value}`;
  }
}
