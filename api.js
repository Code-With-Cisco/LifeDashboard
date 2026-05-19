/**
 * API: Centralized data access layer for Supabase.
 * All sb.from() calls go through this module.
 * Methods that return data throw on error; caller wraps in try/catch.
 * Methods used as guards (getMeta, get) return null on error instead.
 */
window.API = {

  recipes: {
    /** Returns raw array of all recipe rows ordered by profile/name. Throws on error. */
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

    /** Returns full recipe row or null. Returns null on error (does not throw). */
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

    /** Returns {is_template, created_by} or null. Returns null on error (does not throw). */
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

    /** Inserts a new recipe row. Throws on error. */
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

    /** Updates a recipe row owned by ownerId. Throws on error. */
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

    /** Deletes a recipe by id. Throws on error. */
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
    /** Returns array of {habit_id, completed} rows for a user/date. Throws on error. */
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

    /** Upserts a habit completion record. Throws on error. */
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
    /** Inserts a nutrition log entry. Throws on error. */
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

    /** Returns nutrition entry for a date or null. Returns null on error (does not throw). */
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
