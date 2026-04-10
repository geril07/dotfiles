local cache_utils = require("my.utils.cache")

local M = {}

function M.get_nvim_tree_values_from_cache()
  local default_value = { is_float = true, quit_on_open = true }
  local cache = cache_utils.get_cache()

  return vim.tbl_extend("force", default_value, cache or {})
end

function M.set_nvim_tree_values(values)
  cache_utils.set_cache(values)
end

function M.set_nvim_tree_value(key, value)
  cache_utils.set_cache_value(key, value)
end

return M
