const levels = { error: 0, warn: 1, info: 2, debug: 3 };

function makeLogger(currentLevel) {
  const threshold = levels[currentLevel] === undefined ? levels.info : levels[currentLevel];

  function logAt(level, args) {
    if (levels[level] <= threshold) {
      const prefix = "[" + new Date().toISOString() + "] [" + level.toUpperCase() + "]";
      console.log(prefix, ...args);
    }
  }

  return {
    error: (...args) => logAt("error", args),
    warn: (...args) => logAt("warn", args),
    info: (...args) => logAt("info", args),
    debug: (...args) => logAt("debug", args)
  };
}

module.exports = { makeLogger };
