export class ConnectionError extends Error {
    constructor(message: string) {
        super(`Connection Error: ${message}`);
    }
}

export class DatabaseInsertError extends Error {
    constructor(key: string, errorMessage: string) {
        super(`Error inserting into key "${key}". Error: ${errorMessage}`);
    }
}

export class DuplicateSchemaError extends Error {
    constructor(tableName: string) {
        super(`"${tableName}" schema is already registered.`);
    }
}

export class ItemNotFoundError extends Error {
    constructor(key: string, table: string) {
        super(`"${table}" item by primary key "${key}" does not exist.`);
    }
}

export class ItemAlreadyExistsError extends Error {
    constructor(key: string) {
        super(`Item with key "${key}" already exists.`);
    }
}

export class UnregisteredSchemaError extends Error {
    constructor(tableName: string) {
        super(`Schema "${tableName}" is not registered.`);
    }
}

export class ValidationError extends Error {
    constructor(JoiMessage: string) {
        super(JoiMessage);
    }
}

export default {
    ConnectionError,
    DatabaseInsertError,
    DuplicateSchemaError,
    ItemNotFoundError,
    ItemAlreadyExistsError,
    UnregisteredSchemaError,
    ValidationError
};
