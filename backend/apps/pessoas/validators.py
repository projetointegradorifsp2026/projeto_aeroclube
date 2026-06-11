"""
Validação de CPF/CNPJ reutilizável (usada nos cadastros de Cliente, Usuário,
etc.). Mantida em pessoas por ser o app de cadastro de pessoas; pode ser
importada por outros apps sem criar dependência circular.
"""
from django.core.exceptions import ValidationError


def _so_digitos(valor: str) -> str:
    return "".join(filter(str.isdigit, str(valor or "")))


def cpf_valido(digitos: str) -> bool:
    if len(digitos) != 11 or digitos == digitos[0] * 11:
        return False
    for i in (9, 10):
        soma = sum(int(digitos[n]) * ((i + 1) - n) for n in range(i))
        dv = (soma * 10) % 11
        dv = 0 if dv == 10 else dv
        if dv != int(digitos[i]):
            return False
    return True


def cnpj_valido(digitos: str) -> bool:
    if len(digitos) != 14 or digitos == digitos[0] * 14:
        return False
    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    pesos2 = [6] + pesos1
    for pesos, pos in ((pesos1, 12), (pesos2, 13)):
        soma = sum(int(digitos[i]) * pesos[i] for i in range(pos))
        resto = soma % 11
        dv = 0 if resto < 2 else 11 - resto
        if dv != int(digitos[pos]):
            return False
    return True


def validar_cpf_cnpj(valor):
    """
    Validador para usar em serializers/models. Aceita vazio/None (campo opcional);
    se preenchido, exige CPF (11) ou CNPJ (14) válido. Retorna o valor original.
    """
    if valor in (None, ""):
        return valor
    digitos = _so_digitos(valor)
    if len(digitos) == 11:
        if not cpf_valido(digitos):
            raise ValidationError("CPF inválido.")
    elif len(digitos) == 14:
        if not cnpj_valido(digitos):
            raise ValidationError("CNPJ inválido.")
    else:
        raise ValidationError("CPF/CNPJ deve ter 11 (CPF) ou 14 (CNPJ) dígitos.")
    return valor
