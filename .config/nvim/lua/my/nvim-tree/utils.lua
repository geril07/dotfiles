local open_file_opts = require("nvim-tree.actions.node.open-file")
local view_opts = require("nvim-tree.view").View
local cache_utils = require("my.utils.cache")

local M = {
  height_ratio = 0.8,
  width_ratio = 0.5,
}

function M.get_nvim_tree_values_from_cache()
  local default_value = { is_float = true, quit_on_open = true }
  local cache = cache_utils.get_cache()

  local result = vim.tbl_extend("force", default_value, cache or {})
  return result
end

function M.toggle_floating()
  local is_float = not view_opts.float.enable
  view_opts.float.enable = is_float

  if is_float then
    open_file_opts.quit_on_open = true
  else
    local value = cache_utils.get_cache_value("quit_on_open", true)
    open_file_opts.quit_on_open = value
  end

  cache_utils.set_cache({ is_float = is_float })
end

function M.get_tree_float()
  local view = require("nvim-tree.view").View
  return view.float
end

function M.width()
  local is_float = M.get_tree_float().enable
  if is_float then
    return math.floor(vim.opt.columns:get() * M.width_ratio)
  else
    return 35
  end
end

function M.is_floating()
  return view_opts.float.enable
end

function M.toggle_quit_on_open()
  if view_opts.float.enable then
    return
  end

  open_file_opts.quit_on_open = not open_file_opts.quit_on_open

  cache_utils.set_cache_value("quit_on_open", open_file_opts.quit_on_open)
end

return M
