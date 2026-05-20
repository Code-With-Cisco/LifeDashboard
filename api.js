/**
 * api.js — Centralized Supabase data-access layer.
 *
 * PURPOSE: All sb.from() calls are funneled through this module.
 *   Methods that return data throw on error so the caller can handle it.
 *   Guard-style methods (get, getMeta, getForDate) return null on error
 *   instead of throwing, to simplify optional lookups.
 *
 * PUBLIC INTERFACE:
 *   API.recipes   — list, get, getMeta, insert, update, delete
 *   API.habits    — getLogs, upsert
 *   API.nutrition — log, getForDate
 *
 * CONNECTED TO: logs.js (Logger.log / Logger.error)
 *               Supabase JS client (window.sb, initialized in app.js)
 *               main.js, app.js (consumers)
 */
window.API = {

  recipes: {
    /**
     * Return all recipe rows ordered by profile then name.
     * @returns {Promise<Object[]>}
     * @throws {Error} on Supabase error
     */
    list: async function() {
      Logger.log('api', 'recipes.list.start');
      try {
        const {data, error} = await sb.from('recipes').select('*').order('profile_id').order('name');
        if (error) throw error;
        Logger.log('api', 'recipes.list.success', {count: data?.length || 0});
        return data || [];
      } catch(e) {
        Logger.error('api', 'recipes.list', e);
        throw e;
      }
    },

    /**
     * Return the full recipe row for an id, or null if not found.
     * Does not throw — returns null on error.
     * @param {string} id
     * @returns {Promise<Object|null>}
     */
    get: async function(id) {
      try {
        const {data, error} = await sb.from('recipes').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) { Logger.log('api', 'recipes.get.not_found', {id}); return null; }
        Logger.log('api', 'recipes.get.success', {id});
        return data;
      } catch(e) {
        Logger.error('api', 'recipes.get', e);
        return null;
      }
    },

    /**
     * Return {is_template, created_by} for an id, or null on error/not found.
     * @param {string} id
     * @returns {Promise<{is_template: boolean, created_by: string}|null>}
     */
    getMeta: async function(id) {
      try {
        const {data, error} = await sb.from('recipes').select('is_template,created_by').eq('id', id).maybeSingle();
        if (error) throw error;
        return data || null;
      } catch(e) {
        Logger.error('api', 'recipes.getMeta', e);
        return null;
      }
    },

    /**
     * Insert a new recipe row.
     * @param {Object} payload - recipe fields matching the recipes table schema
     * @returns {Promise<void>}
     * @throws {Error} on Supabase error
     */
    insert: async function(payload) {
      Logger.log('api', 'recipes.insert.start', {name: payload.name});
      try {
        const {error} = await sb.from('recipes').insert(payload);
        if (error) throw error;
        Logger.log('api', 'recipes.insert.success');
      } catch(e) {
        Logger.error('api', 'recipes.insert', e);
        throw e;
      }
    },

    /**
     * Update a recipe row, scoped to a specific owner to prevent cross-user edits.
     * @param {Object} payload  - fields to update
     * @param {string} id       - recipe id
     * @param {string} ownerId  - user id; update is a no-op if owner does not match (RLS)
     * @returns {Promise<void>}
     * @throws {Error} on Supabase error
     */
    update: async function(payload, id, ownerId) {
      Logger.log('api', 'recipes.update.start', {id});
      try {
        const {error} = await sb.from('recipes').update(payload).eq('id', id).eq('created_by', ownerId);
        if (error) throw error;
        Logger.log('api', 'recipes.update.success', {id});
      } catch(e) {
        Logger.error('api', 'recipes.update', e);
        throw e;
      }
    },

    /**
     * Delete a recipe by id.
     * @param {string} id
     * @returns {Promise<void>}
     * @throws {Error} on Supabase error
     */
    delete: async function(id) {
      Logger.log('api', 'recipes.delete.start', {id});
      try {
        const {error} = await sb.from('recipes').delete().eq('id', id);
        if (error) throw error;
        Logger.log('api', 'recipes.delete.success', {id});
      } catch(e) {
        Logger.error('api', 'recipes.delete', e);
        throw e;
      }
    }
  },

  habits: {
    /**
     * Return habit log rows ({habit_id, completed}) for a user on a given date.
     * @param {string} userId
     * @param {string} date   - ISO date string (YYYY-MM-DD)
     * @returns {Promise<Array<{habit_id: string, completed: boolean}>>}
     * @throws {Error} on Supabase error
     */
    getLogs: async function(userId, date) {
      Logger.log('api', 'habits.getLogs.start', {date});
      try {
        const {data, error} = await sb.from('habit_logs')
          .select('habit_id,completed')
          .eq('user_id', userId)
          .eq('log_date', date);
        if (error) throw error;
        Logger.log('api', 'habits.getLogs.success', {count: data?.length || 0});
        return data || [];
      } catch(e) {
        Logger.error('api', 'habits.getLogs', e);
        throw e;
      }
    },

    /**
     * Upsert a habit completion record. Conflict key: user_id + log_date + habit_id.
     * @param {string}  userId
     * @param {string}  habitId
     * @param {string}  date      - ISO date string (YYYY-MM-DD)
     * @param {boolean} completed
     * @returns {Promise<void>}
     * @throws {Error} on Supabase error
     */
    upsert: async function(userId, habitId, date, completed) {
      Logger.log('api', 'habits.upsert.start', {habitId, date, completed});
      try {
        const {error} = await sb.from('habit_logs').upsert(
          {user_id: userId, log_date: date, habit_id: habitId, completed},
          {onConflict: 'user_id,log_date,habit_id'}
        );
        if (error) throw error;
        Logger.log('api', 'habits.upsert.success', {habitId, date});
      } catch(e) {
        Logger.error('api', 'habits.upsert', e);
        throw e;
      }
    }
  },

  nutrition: {
    /**
     * Insert a nutrition log entry and return the inserted entry.
     * @param {Object} entry - nutrition_logs row (date, calories, protein_g, …)
     * @returns {Promise<Object>} the original entry object
     * @throws {Error} on Supabase error
     */
    log: async function(entry) {
      Logger.log('api', 'nutrition.log.start', {date: entry.date});
      try {
        const {error} = await sb.from('nutrition_logs').insert(entry);
        if (error) throw error;
        Logger.log('api', 'nutrition.log.success');
        return entry;
      } catch(e) {
        Logger.error('api', 'nutrition.log', e);
        throw e;
      }
    },

    /**
     * Return the nutrition log entry for a specific date, or null.
     * Does not throw — returns null on error.
     * @param {string} date - ISO date string (YYYY-MM-DD)
     * @returns {Promise<Object|null>}
     */
    getForDate: async function(date) {
      try {
        const {data, error} = await sb.from('nutrition_logs').select('*').eq('date', date).maybeSingle();
        if (error) throw error;
        return data || null;
      } catch(e) {
        Logger.error('api', 'nutrition.getForDate', e);
        return null;
      }
    }
  }
};
