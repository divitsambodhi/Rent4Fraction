import pytest

from app.core.errors import map_mysql_signal_message


@pytest.mark.unit
def test_mysql_signal_message_mapping() -> None:
    # 1. Stock unavailable trigger
    raw_error = (
        "OperationalError: (1644, 'Requested quantity exceeds available stock for the given dates')"
    )
    res = map_mysql_signal_message(raw_error)
    assert res is not None
    code, msg, status_code = res
    assert code == "STOCK_UNAVAILABLE"
    assert status_code == 409
    assert msg == "Requested quantity exceeds available stock for the given dates"

    # 2. Minimum rental days violation
    raw_error_2 = "OperationalError: (1644, 'Rental duration is less than minimum rental days required for this equipment')"
    res_2 = map_mysql_signal_message(raw_error_2)
    assert res_2 is not None
    code_2, _, status_code_2 = res_2
    assert code_2 == "MIN_RENTAL_DAYS_VIOLATION"
    assert status_code_2 == 422

    # 3. Address ownership mismatch
    raw_error_3 = "OperationalError: (1644, 'Booking address must belong to the booking customer')"
    res_3 = map_mysql_signal_message(raw_error_3)
    assert res_3 is not None
    code_3, _, status_code_3 = res_3
    assert code_3 == "INVALID_BOOKING_ADDRESS"
    assert status_code_3 == 403

    # 4. Unknown error returns None
    assert map_mysql_signal_message("Unknown syntax error") is None
