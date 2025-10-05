interface RobotRules {
  allow: string[]
  disallow: string[]
}

export function parseRobotsTxt(robotsTxt: string): RobotRules {
  const rules: RobotRules = {
    allow: [],
    disallow: [],
  }

  if (!robotsTxt.trim()) {
    return rules
  }

  const lines = robotsTxt.split('\n')
  let isRelevantSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    // Remove inline comments
    const cleanLine = trimmed.split('#')[0].trim()

    // Check for User-agent
    if (cleanLine.toLowerCase().startsWith('user-agent:')) {
      const agent = cleanLine.substring(11).trim()
      // We're interested in * (all agents) or our specific bot
      isRelevantSection = agent === '*'
      continue
    }

    if (!isRelevantSection) {
      continue
    }

    // Parse Disallow
    if (cleanLine.toLowerCase().startsWith('disallow:')) {
      const path = cleanLine.substring(9).trim()
      if (path) {
        rules.disallow.push(path)
      }
    }

    // Parse Allow
    if (cleanLine.toLowerCase().startsWith('allow:')) {
      const path = cleanLine.substring(6).trim()
      if (path) {
        rules.allow.push(path)
      }
    }
  }

  return rules
}

export function isAllowedByRobots(path: string, robotsTxt: string): boolean {
  const rules = parseRobotsTxt(robotsTxt)

  // If no rules, allow everything
  if (rules.disallow.length === 0 && rules.allow.length === 0) {
    return true
  }

  // Check allow rules first (they take precedence)
  for (const allowPath of rules.allow) {
    if (matchesPattern(path, allowPath)) {
      return true
    }
  }

  // Then check disallow rules
  for (const disallowPath of rules.disallow) {
    if (matchesPattern(path, disallowPath)) {
      return false
    }
  }

  // If not explicitly disallowed, allow
  return true
}

function matchesPattern(path: string, pattern: string): boolean {
  // Handle wildcards in robots.txt patterns
  // First escape regex special chars except * and $
  let regexPattern = pattern.replace(/[.+?^{}()|[\]\\]/g, '\\$&')

  // Convert * to .* (match any characters)
  regexPattern = regexPattern.replace(/\*/g, '.*')

  // Handle $ at the end (exact end match)
  const hasEndAnchor = pattern.endsWith('$')
  if (hasEndAnchor) {
    // Remove the $ we just escaped and add it back as regex anchor
    regexPattern = regexPattern.replace(/\\\$$/, '$')
  }

  // Always anchor at the start (robots.txt patterns are prefix matches)
  regexPattern = `^${regexPattern}`

  const regex = new RegExp(regexPattern)
  return regex.test(path)
}
