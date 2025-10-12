declare module 'wink-porter2-stemmer' {
    /** Returns the Porter2 stem of an English word. */
    const stem: (word: string) => string;
    export default stem;
}