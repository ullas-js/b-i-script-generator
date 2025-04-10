// input = "Hello {name}, how are you {name}?, {name: 'John'}"
// output = "Hello John, how are you John?, John"

const replaceT = (input, data) => {
    let output = input;
    for (const [key, value] of Object.entries(data)) {
        output = output.replace(`{${key}}`, value);
    }
    return output;
};

export {
    replaceT
}