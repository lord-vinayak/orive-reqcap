from rest_framework.routers import DefaultRouter
from .views import IngredientRecordViewSet

router = DefaultRouter()
router.register(r'', IngredientRecordViewSet, basename='ingredient-record')
urlpatterns = router.urls
