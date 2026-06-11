from rest_framework.pagination import PageNumberPagination


class FlexPageNumberPagination(PageNumberPagination):
    """Standard pagination that allows the client to override page_size up to max_page_size."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500
