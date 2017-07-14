export function checkRequired(obj : object, keys : string[]): { valid: boolean, missing: string[] }{
    let missing = new Array<string>();
    for(let key of keys){
        if(obj[key] === undefined) missing.push(key);
    }

    return missing.length ? { valid: false, missing } : { valid: true, missing };
}