(function(){
  'use strict';

  const DEFAULT_CONFIG = {
    instrument: 'LupusPRO',
    version: '1.8',
    language: 'ar',
    enabled: false,
    licenseStatus: 'pending',
    sourceStatus: 'awaiting-authorized-instrument-and-scoring-manual',
    missingRule: null,
    items: [],
    domains: []
  };

  function assertNumber(value, label){
    if(typeof value !== 'number' || Number.isNaN(value)){
      throw new Error(label + ' يجب أن يكون رقمًا.');
    }
  }

  function normalizeItem(rawValue, item){
    assertNumber(rawValue, item.id);
    const min = item.min;
    const max = item.max;
    if(rawValue < min || rawValue > max){
      throw new Error('إجابة خارج المجال المسموح للبند ' + item.id);
    }
    const scored = item.reverse ? (max + min - rawValue) : rawValue;
    return { raw: rawValue, scored: scored };
  }

  function transformScore(mean, domain){
    if(domain.transform && domain.transform.type === 'linear-0-100'){
      const min = domain.transform.min;
      const max = domain.transform.max;
      if(max === min) throw new Error('تعذر تحويل الدرجة: مجال غير صالح.');
      return ((mean - min) / (max - min)) * 100;
    }
    if(typeof domain.transform === 'function'){
      return domain.transform(mean);
    }
    return mean;
  }

  function scoreDomain(domain, itemMap, responses, config){
    const answered = [];
    const missing = [];

    domain.items.forEach(function(itemId){
      const item = itemMap[itemId];
      if(!item) throw new Error('البند ' + itemId + ' غير موجود في إعداد الأداة.');
      const value = responses[itemId];
      if(value === undefined || value === null || value === ''){
        missing.push(itemId);
        return;
      }
      answered.push(normalizeItem(Number(value), item).scored);
    });

    const requiredFraction = domain.requiredFraction != null
      ? domain.requiredFraction
      : (config.missingRule && config.missingRule.requiredFraction != null
        ? config.missingRule.requiredFraction
        : 1);

    const completion = domain.items.length ? answered.length / domain.items.length : 0;
    if(completion < requiredFraction){
      return {
        id: domain.id,
        label: domain.label,
        score: null,
        status: 'insufficient-data',
        answered: answered.length,
        total: domain.items.length,
        missing: missing
      };
    }

    const mean = answered.reduce(function(sum, value){ return sum + value; }, 0) / answered.length;
    const score = transformScore(mean, domain);

    return {
      id: domain.id,
      label: domain.label,
      score: Number(score.toFixed(1)),
      status: 'scored',
      answered: answered.length,
      total: domain.items.length,
      missing: missing
    };
  }

  function calculate(responses, suppliedConfig){
    const config = Object.assign({}, DEFAULT_CONFIG, suppliedConfig || {});

    if(!config.enabled){
      return {
        ok: false,
        status: 'disabled',
        reason: 'official-scoring-configuration-not-loaded',
        instrument: config.instrument,
        version: config.version,
        language: config.language,
        domains: []
      };
    }

    if(!Array.isArray(config.items) || !config.items.length || !Array.isArray(config.domains) || !config.domains.length){
      throw new Error('إعداد الأداة غير مكتمل.');
    }

    const itemMap = {};
    config.items.forEach(function(item){ itemMap[item.id] = item; });

    return {
      ok: true,
      status: 'scored',
      instrument: config.instrument,
      version: config.version,
      language: config.language,
      domains: config.domains.map(function(domain){
        return scoreDomain(domain, itemMap, responses || {}, config);
      })
    };
  }

  function compare(current, previous){
    if(current == null || previous == null) return null;
    const delta = Number((current - previous).toFixed(1));
    return { delta: delta, direction: delta > 0 ? 'up' : (delta < 0 ? 'down' : 'same') };
  }

  window.LupusPROEngine = {
    defaultConfig: DEFAULT_CONFIG,
    calculate: calculate,
    compare: compare
  };
})();