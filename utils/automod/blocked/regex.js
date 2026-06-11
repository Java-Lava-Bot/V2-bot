module.exports = {
  regexPatterns: [
    "\\bhttps?://\\S*(mrbeast|nitro|giveaway|airdrop|steam|free|promo|event)\\S*\\.(png|jpe?g|gif|webp)\\b", // Suspicious image URLs with scam-related keywords
    "\\bhttps?://(?:www\\.)?(bit\\.ly|tinyurl\\.com|t\\.ly|is\\.gd|v\\.gd|rb\\.gy|cutt\\.ly|ow\\.ly|goo\\.gl|buff\\.ly|t\\.co|linktr\\.ee)/\\S+\\b", // Common URL shorteners
  ],
};
