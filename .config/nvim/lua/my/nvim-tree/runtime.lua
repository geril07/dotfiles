local persistence = require("my.nvim-tree.persistence")

local M = {
  height_ratio = 0.8,
  width_ratio = 0.5,
}

local function get_config()
  return require("nvim-tree.config")
end

local function get_view_config()
  local config = get_config()
  return config.g and config.g.view or nil
end

local function get_open_file_config()
  local config = get_config()
  return config.g and config.g.actions and config.g.actions.open_file or nil
end

function M.get_tree_float()
  local view_config = assert(get_view_config(), "Failed to get nvim-tree view config")
  return view_config.float
end

function M.is_floating()
  local view_config = get_view_config()

  if view_config and view_config.float then
    return view_config.float.enable
  end

  return persistence.get_nvim_tree_values_from_cache().is_float
end

function M.width()
  if M.is_floating() then
    return math.floor(vim.opt.columns:get() * M.width_ratio)
  end

  return 35
end

function M.toggle_floating()
  local view_config = assert(get_view_config(), "Failed to get nvim-tree view config")
  local open_file_config = assert(get_open_file_config(), "Failed to get nvim-tree open file config")
  local is_float = not view_config.float.enable

  view_config.float.enable = is_float

  if is_float then
    open_file_config.quit_on_open = true
  else
    open_file_config.quit_on_open = persistence.get_nvim_tree_values_from_cache().quit_on_open
  end

  persistence.set_nvim_tree_values({ is_float = is_float })
end

function M.toggle_quit_on_open()
  if M.is_floating() then
    return
  end

  local open_file_config = assert(get_open_file_config(), "Failed to get nvim-tree open file config")

  open_file_config.quit_on_open = not open_file_config.quit_on_open
  persistence.set_nvim_tree_value("quit_on_open", open_file_config.quit_on_open)
end

return M
