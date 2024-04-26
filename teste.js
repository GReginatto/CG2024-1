

switch ( Operacao ) {
    case '+':
        resultado = somar(numero1, numero2);
        break;
    case '-':
        resultado = subtrair(numero1, numero2);
        break;
    case '*':
        resultado = multi(numero1, numero2);
        break;
    case '/':
        resultado = divi(numero1, numero2);
        break;
}




function somar ( a, b ){
    return a + b;
}

function subtrair ( a, b ){
    return a - b;
}

function multi ( a, b ){
    return a * b;
}

function divi ( a, b ){
    return a/b;
}
