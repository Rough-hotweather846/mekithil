/**
 * Admin middleware — only allow whitelisted Telegram user IDs.
 */
function adminOnly(config) {
  return (ctx, next) => {
    const adminIds = config.telegram?.adminIds || [];
    if (!ctx.from || !adminIds.includes(ctx.from.id)) {
      return ctx.reply('🚫 Unauthorized. This bot is admin-only.');
    }
    return next();
  };
}

export { adminOnly };
