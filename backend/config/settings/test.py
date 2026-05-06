from .base import *  # noqa

DEBUG = False

DATABASES["default"].update(  # noqa: F405
    {
        "HOST": "db_test",
        "NAME": "aeroclube_test",
    }
)
