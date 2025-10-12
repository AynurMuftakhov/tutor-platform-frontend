declare module 'wink-lemmatizer' {
    type Lemmatizer = {
        verb: (word: string) => string;
        noun: (word: string) => string;
        adjective: (word: string) => string;
        adverb?: (word: string) => string;
    };
    const lemmatizer: Lemmatizer;
    export = lemmatizer;
}