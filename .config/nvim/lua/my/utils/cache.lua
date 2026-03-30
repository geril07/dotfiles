local Path = require("plenary.path")

local M = {}

M.cache_filename = "geril.json"
M.cache_file_path = string.format("%s/" .. M.cache_filename, vim.fn.stdpath("data"))

function M.get_cache()
  local ok, cache = pcall(function()
    return vim.fn.json_decode(Path.new(M.cache_file_path):read())
  end)
  if ok then
    return cache
  end

  return nil
end

function M.get_cache_value(key, default_value)
  local cache = M.get_cache()

  if not cache then
    if default_value ~= nil then
      return default_value
    end
    return nil
  end

  return cache[key]
end

function M.set_cache(cache)
  local prev_cache = M.get_cache()

  local new_cache = vim.tbl_extend("force", prev_cache or {}, cache)

  Path.new(M.cache_file_path):write(vim.fn.json_encode(new_cache), "w")
end

function M.set_cache_value(key, value)
  local cache = M.get_cache()

  local new_cache = cache or {}

  new_cache[key] = value

  M.set_cache(new_cache)
end

return M
