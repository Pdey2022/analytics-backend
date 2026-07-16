// ============================================================
// Domain-to-category mapping engine
// ============================================================

// Known domain → category map (most common sites)
var CATEGORY_MAP = {
  // Development & Code
  'github.com': 'Development', 'gitlab.com': 'Development', 'bitbucket.org': 'Development',
  'stackoverflow.com': 'Development', 'stackexchange.com': 'Development',
  'npmjs.com': 'Development', 'pypi.org': 'Development', 'mvnrepository.com': 'Development',
  'nuget.org': 'Development', 'crates.io': 'Development', 'rubygems.org': 'Development',
  'dockerhub.com': 'Development', 'hub.docker.com': 'Development',
  'dev.to': 'Development', 'medium.com': 'Development',
  'codepen.io': 'Development', 'jsfiddle.net': 'Development', 'replit.com': 'Development',
  'code.visualstudio.com': 'Development', 'marketplace.visualstudio.com': 'Development',
  'chromium.org': 'Development', 'electronjs.org': 'Development',
  'nodejs.org': 'Development', 'deno.land': 'Development',
  'react.dev': 'Development', 'reactjs.org': 'Development',
  'angular.io': 'Development', 'vuejs.org': 'Development',
  'typescriptlang.org': 'Development', 'playwright.dev': 'Development',
  'vercel.com': 'Development', 'netlify.com': 'Development',
  'heroku.com': 'Development', 'digitalocean.com': 'Development',
  'cloudflare.com': 'Development',
  'azure.microsoft.com': 'Development', 'portal.azure.com': 'Development',
  'aws.amazon.com': 'Development', 'console.aws.amazon.com': 'Development',
  'console.cloud.google.com': 'Development',

  // AI / Chat
  'chat.openai.com': 'AI / Chat', 'chatgpt.com': 'AI / Chat',
  'claude.ai': 'AI / Chat', 'perplexity.ai': 'AI / Chat',
  'gemini.google.com': 'AI / Chat', 'bard.google.com': 'AI / Chat',
  'copilot.microsoft.com': 'AI / Chat', 'bing.com/chat': 'AI / Chat',
  'huggingface.co': 'AI / Chat', 'replicate.com': 'AI / Chat',
  'deepseek.com': 'AI / Chat', 'platform.deepseek.com': 'AI / Chat',
  'easysite.ai': 'AI / Chat', 'gamma.app': 'AI / Chat',
  'notion.ai': 'AI / Chat', 'jasper.ai': 'AI / Chat',

  // Documentation & Learning
  'developer.mozilla.org': 'Documentation', 'docs.python.org': 'Documentation',
  'docs.microsoft.com': 'Documentation', 'learn.microsoft.com': 'Documentation',
  'docs.oracle.com': 'Documentation', 'docs.docker.com': 'Documentation',
  'docs.npmjs.com': 'Documentation', 'w3schools.com': 'Documentation',
  'geeksforgeeks.org': 'Documentation', 'tutorialspoint.com': 'Documentation',
  'udemy.com': 'Documentation', 'coursera.org': 'Documentation',
  'pluralsight.com': 'Documentation',

  // Social Media
  'reddit.com': 'Social Media', 'twitter.com': 'Social Media',
  'x.com': 'Social Media', 'facebook.com': 'Social Media',
  'instagram.com': 'Social Media', 'linkedin.com': 'Social Media',
  'tiktok.com': 'Social Media', 'snapchat.com': 'Social Media',
  'pinterest.com': 'Social Media', 'discord.com': 'Social Media',
  'telegram.org': 'Social Media', 'whatsapp.com': 'Social Media',
  'slack.com': 'Social Media', 'teams.microsoft.com': 'Social Media',

  // Entertainment & Video
  'youtube.com': 'Entertainment', 'twitch.tv': 'Entertainment',
  'vimeo.com': 'Entertainment', 'netflix.com': 'Entertainment',
  'hulu.com': 'Entertainment', 'disneyplus.com': 'Entertainment',
  'primevideo.com': 'Entertainment', 'spotify.com': 'Entertainment',
  'soundcloud.com': 'Entertainment', 'imdb.com': 'Entertainment',
  'rottentomatoes.com': 'Entertainment',

  // Search
  'google.com': 'Search', 'bing.com': 'Search', 'duckduckgo.com': 'Search',
  'yahoo.com': 'Search', 'baidu.com': 'Search', 'ecosia.org': 'Search',

  // Shopping
  'amazon.com': 'Shopping', 'amazon.in': 'Shopping', 'amazon.co.uk': 'Shopping',
  'flipkart.com': 'Shopping', 'ebay.com': 'Shopping', 'walmart.com': 'Shopping',
  'target.com': 'Shopping', 'bestbuy.com': 'Shopping', 'aliexpress.com': 'Shopping',
  'etsy.com': 'Shopping', 'nykaa.com': 'Shopping',

  // News
  'news.ycombinator.com': 'News', 'techcrunch.com': 'News',
  'theverge.com': 'News', 'wired.com': 'News', 'arstechnica.com': 'News',
  'cnn.com': 'News', 'bbc.com': 'News', 'bbc.co.uk': 'News',
  'nytimes.com': 'News', 'reuters.com': 'News', 'theguardian.com': 'News',

  // Email
  'mail.google.com': 'Email', 'outlook.live.com': 'Email',
  'outlook.office.com': 'Email', 'mail.yahoo.com': 'Email',
  'proton.me': 'Email', 'protonmail.com': 'Email',

  // Reference
  'wikipedia.org': 'Reference', 'en.wikipedia.org': 'Reference',
  'dictionary.com': 'Reference', 'thesaurus.com': 'Reference',
  'wolframalpha.com': 'Reference', 'google.scholar.com': 'Reference',
  'scholar.google.com': 'Reference',

  // Productivity & Tools
  'notion.so': 'Productivity', 'miro.com': 'Productivity',
  'trello.com': 'Productivity', 'asana.com': 'Productivity',
  'jira.atlassian.com': 'Productivity', 'atlassian.net': 'Productivity',
  'google.com/docs': 'Productivity', 'docs.google.com': 'Productivity',
  'sheets.google.com': 'Productivity', 'drive.google.com': 'Productivity',
  'calendar.google.com': 'Productivity', 'meet.google.com': 'Productivity',
  'zoom.us': 'Productivity', 'calendly.com': 'Productivity',
  'evernote.com': 'Productivity', 'todoist.com': 'Productivity',
  'linear.app': 'Productivity', 'figma.com': 'Productivity',
  'canva.com': 'Productivity',

  // Browser / Local
  'localhost': 'Development', '127.0.0.1': 'Development',
  'newtab': 'Other', 'extensions': 'Development',

  // Banking / Finance
  'paypal.com': 'Finance', 'stripe.com': 'Finance',
  'square.com': 'Finance', 'venmo.com': 'Finance',
  'robinhood.com': 'Finance', 'coinbase.com': 'Finance',
};

// Category colors for charts
var CATEGORY_COLORS = {
  'Development': '#3b82f6',
  'AI / Chat': '#8b5cf6',
  'Documentation': '#06b6d4',
  'Social Media': '#f43f5e',
  'Entertainment': '#f59e0b',
  'Search': '#6366f1',
  'Shopping': '#10b981',
  'News': '#ec4899',
  'Email': '#14b8a6',
  'Reference': '#0ea5e9',
  'Productivity': '#84cc16',
  'Finance': '#22c55e',
  'Other': '#4a5568',
};

/**
 * Categorize a domain name.
 */
function categorizeDomain(domain) {
  if (!domain) return 'Other';

  // Check exact match first
  if (CATEGORY_MAP[domain]) return CATEGORY_MAP[domain];

  // Check if any key is a suffix of the domain
  var keys = Object.keys(CATEGORY_MAP);
  for (var i = 0; i < keys.length; i++) {
    if (domain.endsWith(keys[i]) || domain.indexOf(keys[i]) >= 0) {
      return CATEGORY_MAP[keys[i]];
    }
  }

  // Keyword-based fallback
  var lower = domain.toLowerCase();

  // Extract the main domain (e.g., "blog.example.com" → "example.com")
  var parts = lower.split('.');
  var mainDomain = null;
  if (parts.length >= 2) {
    mainDomain = parts[parts.length - 2] + '.' + parts[parts.length - 1];
    // Check main domain against map
    if (CATEGORY_MAP[mainDomain]) return CATEGORY_MAP[mainDomain];
  }

  // Keyword-based fallback
  if (lower.indexOf('blog') >= 0 || lower.indexOf('news') >= 0) return 'News';
  if (lower.indexOf('wiki') >= 0 || lower.indexOf('docs') >= 0) return 'Documentation';
  if (lower.indexOf('forum') >= 0 || lower.indexOf('community') >= 0) return 'Social Media';
  if (lower.indexOf('shop') >= 0 || lower.indexOf('store') >= 0 || lower.indexOf('buy') >= 0) return 'Shopping';
  if (lower.indexOf('mail') >= 0) return 'Email';
  if (lower.indexOf('code') >= 0 || lower.indexOf('dev') >= 0 || lower.indexOf('api') >= 0) return 'Development';
  if (lower.indexOf('learn') >= 0 || lower.indexOf('tutor') >= 0 || lower.indexOf('course') >= 0) return 'Documentation';
  if (lower.indexOf('bank') >= 0 || lower.indexOf('finan') >= 0 || lower.indexOf('invest') >= 0) return 'Finance';
  if (lower.indexOf('ai') >= 0 || lower.indexOf('chat') >= 0 || lower.indexOf('gpt') >= 0) return 'AI / Chat';
  if (lower.indexOf('game') >= 0 || lower.indexOf('play') >= 0 || lower.indexOf('quiz') >= 0) return 'Entertainment';
  if (lower.indexOf('azure') >= 0 || lower.indexOf('aws') >= 0 || lower.indexOf('gcp') >= 0 || lower.indexOf('cloud') >= 0) return 'Development';
  if (lower.indexOf('deploy') >= 0) return 'Development';

  return 'Other';
}

module.exports = { categorizeDomain, CATEGORY_COLORS };
